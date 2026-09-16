"use server";

import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface ExtractedBuildingPermitData {
    permitType?: "NEW" | "RENEWAL" | "AMENDATORY";
    permitNumber?: string;
    dateIssued?: string;
    orNumber?: string;
    datePaid?: string;
    fsecNo?: string;
    fsecDateIssued?: string;

    // Permittee & Project
    ownerName?: string;
    projectTitle?: string;

    // Cadastral & Location
    lotNo?: string;
    blkNo?: string;
    tctNo?: string;
    street?: string;
    barangay?: string;

    // Occupancy & Scope
    occupancyGroup?: string;
    occupancyUse?: string;
    scopeOfWork?: string;
    estimatedCost?: string;

    // Signatories
    engineerInCharge?: string;
    buildingOfficial?: string;

    // Remarks
    remarks?: string;
}

export async function scanBuildingPermitDocument({
    base64Data,
    mimeType,
}: {
    base64Data: string;
    mimeType: string;
}): Promise<{ success: boolean; data?: ExtractedBuildingPermitData; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const role = user?.role;

        if (!session || (role !== "ENGINEER" && role !== "ADMIN")) {
            return { success: false, error: "Unauthorized access. Engineer or Admin role required." };
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: "Gemini API key is not configured in server environment.",
            };
        }

        const ai = new GoogleGenAI({ apiKey });

        const promptGuidance = `
You are analyzing an official Philippine Building Permit document (NBC Form No. B - 01B / National Building Code of the Philippines issued by the Office of the Building Official, Municipality of Mapandan, Province of Pangasinan).
Extract the following fields accurately based on the standard layout of NBC Form No. B - 01B:

1. Permit Identification & Control Numbers:
   - permitType: Choose one of "NEW", "RENEWAL", or "AMENDATORY". Default to "NEW" unless explicitly marked otherwise.
   - permitNumber: Building Permit Number (often labeled as "BUILDING PERMIT NO." e.g. "BP-0888-2609-1213" or numerical sequence).
   - dateIssued: Date issued in YYYY-MM-DD format (often labeled as "DATE ISSUED").
   - orNumber: Official Receipt (OR) Number for the building fees (labeled as "O.R. NO.").
   - datePaid: Date the OR was paid in YYYY-MM-DD format (labeled as "DATE PAID").
   - fsecNo: Fire Safety Evaluation Clearance Number (labeled as "FSEC NO.").
   - fsecDateIssued: Date FSEC was issued in YYYY-MM-DD format (labeled as "DATE ISSUED" under FSEC).

2. Permittee / Owner & Project Identification:
   - ownerName: Full name of owner / applicant / permittee (labeled as "OWNER / APPLICANT" or "NAME OF OWNER").
   - projectTitle: Title or type of proposed structure/project (labeled as "PROJECT TITLE" or "PROPOSED WORK", e.g. "1 BEDROOM BUNGALOW", "COMMERCIAL BUILDING", "TWO STOREY RESIDENCE").

3. Location of Construction (Cadastral & Address):
   - lotNo: Lot number (labeled as "LOT NO.").
   - blkNo: Block number (labeled as "BLK NO.").
   - tctNo: Transfer Certificate of Title number (labeled as "TCT NO.").
   - street: Street name or Sitio (labeled as "STREET" or "BARRIO / SITIO").
   - barangay: Exact Barangay in Mapandan (One of: Amanoaoac, Apaya, Aserda, Baloling, Coral, Golden, Jimenez, Lambayan, Loubing, Nilombot, Pias, Poblacion, Primicias, Santa Maria, Torres). If the scan shows e.g. "Brgy. Torres" or "TORRES", extract just "Torres".

4. Character of Occupancy & Scope of Work:
   - occupancyGroup: Occupancy group code, e.g. "GROUP A" (Residential Dwellings), "GROUP B", "GROUP E", etc.
   - occupancyUse: Specific classification (e.g. "Residential", "Commercial", "Institutional", "Industrial", or exact classification written).
   - scopeOfWork: The scope of construction works checked or listed (e.g., "CONCRETE WORKS, CARPENTRY WORKS, TINSMITHY WORKS, ELECTRICAL WORKS, PLUMBING WORKS, PAINTING WORKS").
   - estimatedCost: Total estimated project or building cost (numerical only or decimal string e.g. "1641945.00" or "500000").

5. Key Responsible Signatories:
   - engineerInCharge: Name of the licensed architect, civil engineer, or professional in charge of construction (often with PRC license number). Extract their name (e.g. "ARCHT. ALVIN C. ABROGAR").
   - buildingOfficial: Name of the Municipal Engineer / Building Official who issued and signed the permit (labeled as "BUILDING OFFICIAL" e.g. "ENGR. ANGELO C. ABROGAR").

6. Remarks:
   - remarks: Any specific physical shelf, archive box note, or official annotations written in the margins.
`;

        const fullPrompt = `
Task: Read this Philippine Building Permit (NBC Form No. B - 01B) scan and extract all available details into structured JSON.
${promptGuidance}

STRICT JSON RULES:
1. Return ONLY valid JSON format. No markdown ticks, no backticks (\`\`\`json), no explanatory preamble or postscript.
2. If a field cannot be read or is illegible, leave it as an empty string ("") or omit it. Do not invent fake data.
3. For dates, format as YYYY-MM-DD whenever discernible.
4. Capitalize names and titles appropriately.
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            inlineData: {
                                mimeType: mimeType || "image/jpeg",
                                data: base64Data,
                            },
                        },
                        {
                            text: fullPrompt,
                        },
                    ],
                },
            ],
        });

        const rawText = response.text?.trim() || "";

        // Clean possible markdown code fences
        const cleanedText = rawText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        const parsedData: ExtractedBuildingPermitData = JSON.parse(cleanedText);

        return {
            success: true,
            data: parsedData,
        };
    } catch (err: any) {
        console.error("AI Building Permit Scanner error:", err);
        return {
            success: false,
            error: err.message || "Failed to process building permit scan with AI.",
        };
    }
}
