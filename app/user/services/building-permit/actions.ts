"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";

export async function submitBuildingPermit(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }
    const userId = session.user.id;

    // Get Building Permit Transaction Type
    const type = await prisma.transactionType.findFirst({
      where: { code: "BUILDING_PERMIT" }
    });
    
    if (!type) {
      return { success: false, error: "Building Permit transaction type not found in database." };
    }

    // Extract basic form data
    const descriptionOfWork = formData.get("descriptionOfWork") as string;
    const occupancyUse = formData.get("occupancyUse") as string;
    const estimatedCost = formData.get("estimatedCost") as string;
    const locationOfConstruction = formData.get("locationOfConstruction") as string;
    const isLotOwner = formData.get("isLotOwner") as string;
    const houseNumber = formData.get("houseNumber") as string;
    const street = formData.get("street") as string;
    const barangay = formData.get("barangay") as string;
    const totalFloorsVal = formData.get("totalFloors") as string;
    const totalFloors = totalFloorsVal ? parseInt(totalFloorsVal, 10) : null;

    // Prepare JSON for additional Data
    const additionalData: any = {
      descriptionOfWork,
      occupancyUse,
      estimatedCost,
      locationOfConstruction,
      isLotOwner,
      houseNumber,
      street,
      barangay,
      totalFloors,
      documents: {}
    };

    // Helper to upload and store URL
    const processFile = async (key: string, folder: string) => {
      const value = formData.get(key);
      if (typeof value === "string" && value.startsWith("http")) {
        additionalData.documents[key] = value;
      } else if (value instanceof File && value.size > 0) {
        const timestamp = Date.now();
        const path = `building-permits/${userId}/${folder}/${timestamp}-${value.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const url = await uploadFile(value, path);
        if (url) {
          additionalData.documents[key] = url;
        }
      }
    };

    // Upload ID and TCT if they exist
    await processFile("newIdFile", "ids");
    await processFile("newIdFileBack", "ids");
    await processFile("tctFile", "tct");

    // Loop through requirements and permits
    for (const [key] of Array.from(formData.entries())) {
      if (key.startsWith("req_") || key.startsWith("permit_")) {
         await processFile(key, key.startsWith("req_") ? "requirements" : "permits");
      }
    }

    // Get current resident data for snapshot
    const resident = await prisma.resident.findFirst({
      where: { userId: userId }
    });

    // Create the transaction (FOR_REQUESTING)
    const transaction = await prisma.transaction.create({
      data: {
        userId: userId,
        typeId: type.id,
        status: "FOR_REQUESTING",
        residentSnapshot: resident ? (resident as any) : {},
        additionalData: additionalData,
        totalAmount: 0,
      }
    });

    revalidatePath("/user/transactions");
    return { success: true, transactionId: transaction.id };

  } catch (error) {
    console.error("Building Permit Submission Error:", error);
    return { success: false, error: "Failed to submit building permit application." };
  }
}

export async function saveTransactionSignature(transactionId: string, signatureBase64: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction || transaction.userId !== session.user.id) {
      return { success: false, error: "Transaction not found or unauthorized" };
    }

    const additionalData = transaction.additionalData as any || {};
    additionalData.signature = signatureBase64;

    await prisma.transaction.update({
      where: { id: transactionId },
      data: { additionalData }
    });

    revalidatePath("/user/transactions");
    return { success: true };

  } catch (error) {
    console.error("Save signature error:", error);
    return { success: false, error: "Failed to save signature." };
  }
}

export async function getExistingBuildingPermits() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, data: [] };
    }

    const type = await prisma.transactionType.findFirst({
      where: { code: "BUILDING_PERMIT" }
    });

    if (!type) {
      return { success: false, data: [] };
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        typeId: type.id
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: transactions };
  } catch (error) {
    console.error("Error fetching existing permits:", error);
    return { success: false, data: [] };
  }
}

export async function resubmitBuildingPermit(transactionId: string, formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }
    const userId = session.user.id;

    // Fetch the existing transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId, userId: userId }
    });

    if (!transaction || transaction.status !== "FOR_REVISION") {
      return { success: false, error: "Invalid transaction for resubmission" };
    }

    const additionalData = transaction.additionalData as any || { documents: {} };
    if (!additionalData.documents) {
      additionalData.documents = {};
    }

    // Extract basic form data
    const descriptionOfWork = formData.get("descriptionOfWork") as string;
    const occupancyUse = formData.get("occupancyUse") as string;
    const estimatedCost = formData.get("estimatedCost") as string;
    const locationOfConstruction = formData.get("locationOfConstruction") as string;
    const isLotOwner = formData.get("isLotOwner") as string;
    const houseNumber = formData.get("houseNumber") as string;
    const street = formData.get("street") as string;
    const barangay = formData.get("barangay") as string;
    const totalFloorsVal = formData.get("totalFloors") as string;
    const totalFloors = totalFloorsVal ? parseInt(totalFloorsVal, 10) : null;

    if (descriptionOfWork) additionalData.descriptionOfWork = descriptionOfWork;
    if (occupancyUse) additionalData.occupancyUse = occupancyUse;
    if (estimatedCost) additionalData.estimatedCost = estimatedCost;
    if (locationOfConstruction) additionalData.locationOfConstruction = locationOfConstruction;
    if (isLotOwner) additionalData.isLotOwner = isLotOwner;
    if (houseNumber) additionalData.houseNumber = houseNumber;
    if (street) additionalData.street = street;
    if (barangay) additionalData.barangay = barangay;
    if (totalFloors !== undefined) additionalData.totalFloors = totalFloors;

    // Helper to upload and store URL
    const processFile = async (key: string, folder: string) => {
      const value = formData.get(key);
      if (typeof value === "string" && value.startsWith("http")) {
        additionalData.documents[key] = value;
      } else if (value instanceof File && value.size > 0) {
        const timestamp = Date.now();
        const path = `building-permits/${userId}/${folder}/${timestamp}-${value.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const url = await uploadFile(value, path);
        if (url) {
          additionalData.documents[key] = url;
        }
      }
    };

    // Upload ID and TCT if they exist
    await processFile("newIdFile", "ids");
    await processFile("newIdFileBack", "ids");
    await processFile("tctFile", "tct");

    // Loop through requirements and permits
    for (const [key] of Array.from(formData.entries())) {
      if (key.startsWith("req_") || key.startsWith("permit_")) {
         await processFile(key, key.startsWith("req_") ? "requirements" : "permits");
      }
    }

    // Get current resident data for snapshot update
    const resident = await prisma.resident.findFirst({
      where: { userId: userId }
    });

    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "FOR_REQUESTING",
        rejectionRemarks: null,
        residentSnapshot: resident ? (resident as any) : {},
        additionalData: additionalData,
      }
    });

    revalidatePath("/user/transactions");
    return { success: true, transactionId: updatedTransaction.id };

  } catch (error) {
    console.error("Building Permit Resubmission Error:", error);
    return { success: false, error: "Failed to resubmit building permit application." };
  }
}

export async function submitBuildingPermitPaymentProof(transactionId: string, formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return { success: false, error: "Unauthorized" };

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction || transaction.userId !== userId) {
      return { success: false, error: "Transaction not found" };
    }

    const file = formData.get("paymentFile") as File;
    if (!file || file.size === 0) {
      return { success: false, error: "No file provided" };
    }

    const gcashRefNo = formData.get("gcashReferenceNo") as string;

    const timestamp = Date.now();
    const path = `building-permits/${userId}/payments/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const paymentProofUrl = await uploadFile(file, path);

    if (!paymentProofUrl) {
      return { success: false, error: "Failed to upload payment proof" };
    }

    const currentAdditionalData = (transaction.additionalData as any) || {};

    // Clear rejection remarks if any, set payment reference
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymentReference: paymentProofUrl,
        rejectionRemarks: null,
        additionalData: {
          ...currentAdditionalData,
          gcashReferenceNo: gcashRefNo || currentAdditionalData.gcashReferenceNo || null
        },
        updatedAt: new Date()
      }
    });

    revalidatePath("/user/services/building-permit");
    revalidatePath("/admin/treasury");
    return { success: true, transactionId: updatedTransaction.id };
  } catch (error) {
    console.error("Payment Proof Upload Error:", error);
    return { success: false, error: "Failed to upload payment proof" };
  }
}

export async function submitClearancesForReviewAction(transactionId: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return { success: false, error: "Unauthorized" };

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction || transaction.userId !== userId) {
      return { success: false, error: "Transaction not found" };
    }

    const currentAdditionalData = (transaction.additionalData as any) || {};

    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "PAID",
        additionalData: {
          ...currentAdditionalData,
          clearancesSubmitted: true
        }
      }
    });

    revalidatePath("/user/services/building-permit");
    revalidatePath("/admin/engineering");
    return { success: true };
  } catch (error) {
    console.error("Submit Clearances Error:", error);
    return { success: false, error: "Failed to submit clearances" };
  }
}

export async function checkActivePropertyPermit(location: string, currentTransactionId?: string) {
  try {
    if (!location || location.trim().length < 5) {
      return { success: true, isProcessing: false };
    }

    const type = await prisma.transactionType.findFirst({
      where: { code: "BUILDING_PERMIT" }
    });

    if (!type) {
      return { success: false, error: "Transaction type not found" };
    }

    // Get all active building permit transactions
    const activeTransactions = await prisma.transaction.findMany({
      where: {
        typeId: type.id,
        isCancelled: false,
        status: {
          notIn: ["RELEASED", "REJECTED", "DELIVERED"]
        },
        id: currentTransactionId ? { not: currentTransactionId } : undefined
      },
      select: {
        id: true,
        additionalData: true,
        residentSnapshot: true
      }
    });

    // Clean location for fuzzy comparison
    const cleanLocation = location.trim().toLowerCase().replace(/\s+/g, ' ');

    const duplicate = activeTransactions.find(tx => {
      const addData = tx.additionalData as any;
      if (addData && addData.locationOfConstruction) {
        const txLoc = String(addData.locationOfConstruction).trim().toLowerCase().replace(/\s+/g, ' ');
        return txLoc === cleanLocation;
      }
      return false;
    });

    if (duplicate) {
      const residentSnapshot = duplicate.residentSnapshot as any;
      const applicantName = residentSnapshot ? `${residentSnapshot.firstName} ${residentSnapshot.lastName}` : "Another resident";
      return { 
        success: true, 
        isProcessing: true, 
        applicantName,
        transactionId: duplicate.id 
      };
    }

    return { success: true, isProcessing: false };
  } catch (error) {
    console.error("Error checking active property permit:", error);
    return { success: false, error: "Failed to verify property status" };
  }
}

export async function getBarangaysAction() {
  try {
    const barangays = await prisma.barangayInfo.findMany({
      orderBy: { name: "asc" }
    });
    return { success: true, data: barangays.map(b => b.name) };
  } catch (error) {
    console.error("Error fetching barangays:", error);
    return { success: false, data: [] };
  }
}
