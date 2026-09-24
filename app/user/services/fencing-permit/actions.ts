"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile, validatePayloadFiles } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { sanitizeObject, sanitizeString } from "@/lib/validation";

export async function submitFencingPermit(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized. Please sign in to submit." };
    }
    const userId = session.user.id;

    // Find Fencing Permit Transaction Type
    let type = await prisma.transactionType.findFirst({
      where: { code: "FENCING_PERMIT" }
    });

    if (!type) {
      type = await prisma.transactionType.findFirst({
        where: {
          OR: [
            { code: { startsWith: "FENCING" } },
            { name: { contains: "Fencing", mode: "insensitive" } }
          ]
        }
      });
    }

    if (!type) {
      return { success: false, error: "Fencing Permit transaction type not found in database." };
    }

    // Fetch resident profile snapshot
    const resident = await prisma.resident.findFirst({
      where: { userId }
    });

    // Extract basic form fields with resident fallback
    const barangay = sanitizeString(formData.get("barangay") as string || resident?.barangay || "Mapandan");
    const street = sanitizeString(formData.get("street") as string || resident?.street || "");
    const estimatedCost = sanitizeString(formData.get("estimatedCost") as string || "0");
    const fenceType = sanitizeString(formData.get("fenceType") as string || "Concrete Hollow Block (CHB) & Steel Grille");
    const fenceSecurityFeature = sanitizeString(formData.get("fenceSecurityFeature") as string || "NONE");
    const fenceLength = sanitizeString(formData.get("fenceLength") as string || "0");
    const fenceHeight = sanitizeString(formData.get("fenceHeight") as string || "0");
    
    // Process signature: Can be File or string
    let signatureUrl: string | null = null;
    const signatureEntry = formData.get("signature");
    if (signatureEntry instanceof File && signatureEntry.size > 0) {
      const sigPath = `fencing-permits/${userId}/signatures/${Date.now()}-signature.png`;
      signatureUrl = await uploadFile(signatureEntry, sigPath);
    } else if (typeof signatureEntry === "string" && signatureEntry.trim().length > 0) {
      signatureUrl = signatureEntry;
    }

    // Process and upload attached document files
    const documents: Record<string, string> = {};

    for (const [key, value] of Array.from(formData.entries())) {
      if (value instanceof File && value.size > 0 && !key.startsWith("signature")) {
        const timestamp = Date.now();
        const safeFileName = value.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `fencing-permits/${userId}/${key}/${timestamp}-${safeFileName}`;
        const uploadedUrl = await uploadFile(value, storagePath);
        if (uploadedUrl) {
          documents[key] = uploadedUrl;
        }
      }
    }

    // Ensure mandatory proof of ownership & plans exist
    const mandatoryKeys = [
      "proofOfOwnership",
      "taxDeclaration",
      "rptReceipt",
      "lotPlan",
      "fencingPlans",
      "billOfMaterials",
      "barangayClearance",
      "governmentId"
    ];

    const missingDocs = mandatoryKeys.filter(k => !documents[k]);
    if (missingDocs.length > 0) {
      return {
        success: false,
        error: `Missing mandatory documents (${missingDocs.length} items missing). Please upload all required files.`
      };
    }

    // Build comprehensive additionalData for Engineering Office evaluation
    const parsedCost = parseFloat(estimatedCost.replace(/,/g, "")) || 0;
    const parsedLength = parseFloat(fenceLength) || 0;
    const parsedHeight = parseFloat(fenceHeight) || 0;

    const customLabels: Record<string, string> = {
      proofOfOwnership: "Proof of Land Ownership",
      taxDeclaration: "Tax Declaration of Real Property",
      rptReceipt: "Current RPT Official Receipt & Tax Clearance",
      lotPlan: "Certified Lot Plan & Boundary Survey",
      fencingPlans: "Architectural & Structural Fencing Plans",
      billOfMaterials: "Itemized Bill of Materials & Cost Estimate",
      barangayClearance: "Barangay Construction Clearance (Fencing)",
      governmentId: "Valid Government ID & Cedula",
      zoningClearance: "Locational / Zoning Clearance",
      dpwhClearance: "DPWH Clearance (National Highway)",
      neighborConsent: "Notarized Neighbor Consent / Affidavit",
      electricalPlan: "Electrical Layout & Energizer Specification",
    };

    const additionalData: Record<string, any> = {
      serviceCategory: "ENGINEERING_ACCESSORY",
      permitType: "FENCING_PERMIT",
      barangay,
      street,
      projectAddress: `${street ? street + ", " : ""}Brgy. ${barangay}, Mapandan, Pangasinan`,
      estimatedCost: parsedCost,
      fenceType,
      fenceSecurityFeature,
      fenceLength: parsedLength,
      fenceHeight: parsedHeight,
      // FormSchema and Admin compatibility mappings
      applicantName: resident ? `${resident.firstName} ${resident.lastName}` : "Applicant",
      lengthInMeters: parsedLength,
      heightInMeters: parsedHeight,
      location: `${street ? street + ", " : ""}Brgy. ${barangay}, Mapandan, Pangasinan`,
      fencingLocation: {
        barangay,
        street,
        estimatedCost: parsedCost,
        fenceType,
        fenceSecurityFeature,
        fenceLength: parsedLength,
        fenceHeight: parsedHeight,
      },
      customLabels,
      documents,
      signature: signatureUrl || null,
      submittedAt: new Date().toISOString(),
    };

    // Validate payload magic numbers
    const fileCheck = await validatePayloadFiles(additionalData, "fencing_permits");
    if (!fileCheck.success) {
      return { success: false, error: fileCheck.error || "File security verification failed." };
    }

    const sanitizedAdditionalData = sanitizeObject(additionalData);
    if (signatureUrl) {
      sanitizedAdditionalData.signature = signatureUrl;
    }
    const sanitizedResidentSnapshot = resident ? sanitizeObject(resident) : {};

    // Create Transaction in FOR_INSPECTION state (queued for Municipal Engineer site inspection)
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        typeId: type.id,
        status: "FOR_INSPECTION",
        residentSnapshot: sanitizedResidentSnapshot as any,
        additionalData: sanitizedAdditionalData as any,
        totalAmount: 0,
      }
    });

    revalidatePath("/user/transactions");
    revalidatePath("/user/services");
    revalidatePath("/admin/engineer");

    try {
      const { broadcastRealtimeUpdate } = await import("@/app/api/realtime/stream/route");
      broadcastRealtimeUpdate({
        type: "NEW_TRANSACTION",
        transactionId: transaction.id,
        status: "FOR_INSPECTION",
        department: "ENGINEERING"
      });
    } catch (e) {
      console.warn("Realtime broadcast skipped:", e);
    }

    return {
      success: true,
      data: {
        id: transaction.id,
        status: transaction.status
      }
    };
  } catch (error: any) {
    console.error("submitFencingPermit error:", error);
    return {
      success: false,
      error: error?.message || "Failed to submit fencing permit application."
    };
  }
}
