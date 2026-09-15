"use server";

import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface ExtractedCivilData {
    registryNo?: string;
    bookNo?: string;
    pageNo?: string;
    dateRegistered?: string;
    // Birth fields
    childName?: string;
    sex?: "MALE" | "FEMALE";
    dateOfBirth?: string;
    placeOfBirth?: string;
    fatherName?: string;
    motherMaidenName?: string;
    // Death fields
    deceasedName?: string;
    dateOfDeath?: string;
    placeOfDeath?: string;
    ageAtDeath?: string;
    causeOfDeath?: string;
    // Marriage fields
    husbandName?: string;
    wifeName?: string;
    dateOfMarriage?: string;
    placeOfMarriage?: string;
    solemnizingOfficer?: string;
    // General
    remarks?: string;
}

export async function scanCivilRegistryDocument({
    base64Data,
    mimeType,
    category,
}: {
    base64Data: string;
    mimeType: string;
    category: "BIRTH" | "DEATH" | "MARRIAGE";
}): Promise<{ success: boolean; data?: ExtractedCivilData; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: "Unauthorized access." };
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: "Gemini API key is not configured in server environment.",
            };
        }

        const ai = new GoogleGenAI({ apiKey });

        let promptGuidance = "";
        if (category === "BIRTH") {
            promptGuidance = `
You are analyzing a Philippine Certificate of Live Birth (Municipal Form 102 / PSA / Local Civil Registry birth record).
Extract the following fields accurately:
- registryNo: Registry Number / Local Civil Registry Number (usually top right or header)
- bookNo: Book number if specified
- pageNo: Page number if specified
- dateRegistered: Date of registration in YYYY-MM-DD format (if readable)
- childName: Full name of the child (First Name, Middle Name, Last Name)
- sex: Either "MALE" or "FEMALE"
- dateOfBirth: Date of birth in YYYY-MM-DD format
- placeOfBirth: Hospital/clinic or Municipality/Province of birth (default to "Mapandan, Pangasinan" if location indicates Mapandan)
- fatherName: Full name of father
- motherMaidenName: Maiden name of mother (First, Middle, Last)
`;
        } else if (category === "DEATH") {
            promptGuidance = `
You are analyzing a Philippine Certificate of Death (Municipal Form 103 / Local Civil Registry death record).
Extract the following fields accurately:
- registryNo: Registry Number / Local Civil Registry Number
- bookNo: Book number if specified
- pageNo: Page number if specified
- dateRegistered: Date of registration in YYYY-MM-DD format
- deceasedName: Full name of the deceased individual
- sex: Either "MALE" or "FEMALE"
- dateOfDeath: Date of death in YYYY-MM-DD format
- placeOfDeath: Hospital, Residence, or Municipality of death
- ageAtDeath: Age at death (e.g., "72", "45 years old")
- causeOfDeath: Immediate or underlying cause of death if legible
`;
        } else if (category === "MARRIAGE") {
            promptGuidance = `
You are analyzing a Philippine Certificate of Marriage (Municipal Form 97 / Local Civil Registry marriage record).
Extract the following fields accurately:
- registryNo: Registry Number / Local Civil Registry Number
- bookNo: Book number if specified
- pageNo: Page number if specified
- dateRegistered: Date of registration in YYYY-MM-DD format
- husbandName: Full name of husband / groom
- wifeName: Full maiden name of wife / bride
- dateOfMarriage: Date of marriage ceremony in YYYY-MM-DD format
- placeOfMarriage: Church, Office, or Municipality of marriage
- solemnizingOfficer: Name and title of the solemnizing officer / priest / judge / mayor
`;
        }

        const fullPrompt = `
Task: Read this civil registry document scan and extract the pertinent details into structured JSON.
${promptGuidance}

STRICT JSON RULES:
1. Return ONLY valid JSON format. No markdown ticks, no backticks (\`\`\`json), no explanatory preamble or postscript.
2. If a field cannot be read or is illegible, leave it as an empty string ("") or omit it. Do not invent fake data.
3. For dates, format as YYYY-MM-DD whenever the year, month, and day are discernible. If only partial, leave readable string.
4. Capitalize proper nouns appropriately.
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

        const parsedData: ExtractedCivilData = JSON.parse(cleanedText);

        return {
            success: true,
            data: parsedData,
        };
    } catch (err: any) {
        console.error("AI Document Scan Error:", err);
        return {
            success: false,
            error: err?.message || "Failed to scan and extract document content.",
        };
    }
}
