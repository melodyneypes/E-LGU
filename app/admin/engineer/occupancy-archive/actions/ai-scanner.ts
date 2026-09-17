"use server";

import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface ExtractedOccupancyData {
    occupancyType?: "FULL" | "PARTIAL";
    permitNumber?: string; // Certificate of Occupancy No. (COC No.)
    dateIssued?: string;
    fsicNo?: string;
    fsicDateIssued?: string;
    orNumber?: string;
    datePaid?: string;

    // Associated Building Permit
    buildingPermitNumber?: string;
    buildingPermitDate?: string;

    // Owner & Project
    ownerName?: string;
    projectTitle?: string;
    dateOfCompletion?: string;

    // Occupancy Classification & Location
    occupancyGroup?: string;
    occupancyUse?: string;
    street?: string;
    barangay?: string;

    // Signatories & Notes
    buildingOfficial?: string;
    buildingOfficialDate?: string;
    remarks?: string;
}

export async function scanOccupancyCertificateDocument({
    base64Data,
    mimeType,
}: {
    base64Data: string;
    mimeType: string;
}): Promise<{ success: boolean; data?: ExtractedOccupancyData; error?: string }> {
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
You are analyzing an official Philippine Certificate of Occupancy document (issued by the Office of the Building Official, Municipality of Mapandan, Province of Pangasinan pursuant to Section 309 of the National Building Code of the Philippines, PD 1096).
Extract the following fields accurately based on the standard layout of the Certificate of Occupancy:

1. Occupancy Type & Control Numbers (Top Section):
   - occupancyType: Check whether "FULL" or "PARTIAL" is checked or shaded at the top below "CERTIFICATE OF OCCUPANCY". Return either "FULL" or "PARTIAL". (Default to "FULL" if FULL is checked).
   - permitNumber: Certificate of Occupancy Number (labeled as "No. COC-" or "No." e.g. "COC-2026-06-221" or similar sequence).
   - dateIssued: Date issued for the Certificate of Occupancy in YYYY-MM-DD format (often labeled as "Date Issued" directly below No. COC).
   - fsicNo: Fire Safety Inspection Certificate Number (labeled as "FSIC NO." e.g. "R1-10429-4691243").
   - fsicDateIssued: Date the FSIC was issued in YYYY-MM-DD format (labeled as "Date Issued" directly below FSIC NO.).
   - orNumber: Official Receipt Number (labeled as "Official Receipt No.:" e.g. "4792885").
   - datePaid: Date the Official Receipt was paid in YYYY-MM-DD format (labeled as "Date Paid:"). If only month/year is legible (e.g. "June 2026"), format as the best discernible date or approximate YYYY-MM-01.

2. Associated Building Permit Reference:
   - buildingPermitNumber: The referenced Building Permit Number mentioned in the body paragraph (e.g. "...conforms to the issued Building Permit No. BP-0888-2604-1174").
   - buildingPermitDate: The date the referenced Building Permit was issued (e.g. "...dated April 16, 2026") in YYYY-MM-DD format.

3. Owner & Project Identification:
   - ownerName: Full name of owner (labeled as "Name of Owner :" e.g. "VERNA VISPERAS").
   - projectTitle: Title or description of the project (labeled as "Name of Project :" e.g. "TWO BEDROOM TWO UNITS RESIDENTIAL BUILDING").
   - dateOfCompletion: Date of completion in YYYY-MM-DD format or YYYY-MM (labeled as "Date of Completion :" e.g. "JUNE 2026"). Format as YYYY-MM-DD if day is present, otherwise YYYY-MM-01.

4. Character of Occupancy & Location:
   - occupancyUse: Classification of occupancy (labeled as "Use or Character of Occupancy: RESIDENTIAL" e.g. "Residential", "Commercial").
   - occupancyGroup: Group letter code (labeled as "Group: A" e.g. "GROUP A", "GROUP B").
   - street: Street or Sitio name (if written under "Located at :").
   - barangay: Exact Barangay in Mapandan (labeled under "Located at : [BARANGAY], MAPANDAN, PANGASINAN"). Must match one of Mapandan's 15 Barangays: Amanoaoac, Apaya, Aserda, Baloling, Coral, Golden, Jimenez, Lambayan, Loubing, Nilombot, Pias, Poblacion, Primicias, Santa Maria, Torres. (e.g. if "AMANOAOAC", return "Amanoaoac").

5. Responsible Signatory:
   - buildingOfficial: Name of the Municipal Engineer / Building Official who signed the certificate (e.g. "ENGR. ANGELO C. ABROGAR").
   - buildingOfficialDate: Date signed by the Building Official located under their name/title in YYYY-MM-DD format (e.g. "JUN 23 2026" -> "2026-06-23").

6. Remarks:
   - remarks: Any specific annotations, box references, or conditions noted on the document.
`;

        const fullPrompt = `
Task: Read this Philippine Certificate of Occupancy scan and extract all available details into structured JSON.
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

        const cleanedText = rawText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        const parsedData: ExtractedOccupancyData = JSON.parse(cleanedText);

        return {
            success: true,
            data: parsedData,
        };
    } catch (err: any) {
        console.error("AI Occupancy Certificate Scanner error:", err);
        return {
            success: false,
            error: "Unable to extract permit details. Please check the scan clarity and try again.",
        };
    }
}
