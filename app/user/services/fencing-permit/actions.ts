"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile, validatePayloadFiles } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { sanitizeObject, sanitizeString } from "@/lib/validation";

export async function getActiveFencingPermit() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, data: null };

    const activeTx = await prisma.transaction.findFirst({
      where: {
        userId: session.user.id,
        type: {
          code: { startsWith: "FENCING" }
        },
        status: {
          notIn: ["RELEASED", "DELIVERED", "REJECTED"]
        },
        isCancelled: false
      },
      include: {
        type: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return { success: true, data: activeTx };
  } catch (e: any) {
    console.error("Get active fencing permit error:", e);
    return { success: false, data: null };
  }
}

export async function submitFencingPermit(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized. Please sign in to submit." };
    }
    const userId = session.user.id;

    // Guard: Prevent duplicate submission if an active fencing permit is already ongoing
    const activeTx = await prisma.transaction.findFirst({
      where: {
        userId,
        type: {
          code: { startsWith: "FENCING" }
        },
        status: {
          notIn: ["RELEASED", "DELIVERED", "REJECTED"]
        },
        isCancelled: false
      }
    });

    if (activeTx) {
      return {
        success: false,
        error: `You currently have an ongoing Fencing Permit application (${activeTx.id}). You cannot apply for a new permit until your current request is Released, Rejected, or Cancelled.`
      };
    }

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
    const barangay = sanitizeString(formData.get("barangay") as string || resident?.barangay || "{{BARANGAY_NAME}}");
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
      projectAddress: `${street ? street + ", " : ""}Brgy. ${barangay}, Municipality of E-LGU`,
      estimatedCost: parsedCost,
      fenceType,
      fenceSecurityFeature,
      fenceLength: parsedLength,
      fenceHeight: parsedHeight,
      // FormSchema and Admin compatibility mappings
      applicantName: resident ? `${resident.firstName} ${resident.lastName}` : "Applicant",
      lengthInMeters: parsedLength,
      heightInMeters: parsedHeight,
      location: `${street ? street + ", " : ""}Brgy. ${barangay}, Municipality of E-LGU`,
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
      zoningStatus: "FOR_REQUESTING",
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

    // Create Transaction in FOR_REQUESTING state (queued for MPDC Zoning initial desk evaluation)
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        typeId: type.id,
        status: "FOR_REQUESTING",
        residentSnapshot: sanitizedResidentSnapshot as any,
        additionalData: sanitizedAdditionalData as any,
        totalAmount: 0,
      }
    });

    revalidatePath("/user/transactions");
    revalidatePath("/user/services");
    revalidatePath("/admin/zoning");
    revalidatePath("/admin/engineer");

    try {
      const { broadcastRealtimeUpdate } = await import("@/app/api/realtime/stream/route");
      broadcastRealtimeUpdate({
        type: "NEW_TRANSACTION",
        transactionId: transaction.id,
        status: "FOR_REQUESTING",
        department: "ZONING"
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
