"use server";

import prisma from "@/lib/db/prisma";
import { generateQueueNumber } from "@/lib/queue";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile, validatePayloadFiles } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { sanitizeObject, sanitizeString } from "@/lib/validation";

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
    const appointmentSlot = formData.get("appointmentSlot") as string;
    const appointmentDateStr = formData.get("appointmentDate") as string;
    const appointmentDate = appointmentDateStr ? new Date(appointmentDateStr) : null;
    
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

    const customLabelsStr = formData.get("customLabels") as string;
    let customLabels = {};
    if (customLabelsStr) {
      try {
        customLabels = JSON.parse(customLabelsStr);
      } catch (e) {
        console.error("Error parsing customLabels", e);
      }
    }

    const selectedAncillaryStructuresRaw = formData.get("selectedAncillaryStructures") as string;
    let selectedAncillaryStructures: string[] = [];
    if (selectedAncillaryStructuresRaw) {
      try {
        selectedAncillaryStructures = JSON.parse(selectedAncillaryStructuresRaw);
      } catch (e) {
        console.error("Error parsing selectedAncillaryStructures", e);
      }
    }

    // Prepare JSON for additional Data
    const additionalData: any = {
      descriptionOfWork,
      occupancyUse,
      selectedAncillaryStructures,
      estimatedCost,
      locationOfConstruction,
      isLotOwner,
      houseNumber,
      street,
      barangay,
      totalFloors,
      documents: {},
      customLabels
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
      } else if (key.startsWith("revision_")) {
         await processFile(key, "revision");
      }
    }

    // Get current resident data for snapshot
    const resident = await prisma.resident.findFirst({
      where: { userId: userId }
    });

    // Validate magic numbers of all uploaded files in additionalData
    const fileCheck = await validatePayloadFiles(additionalData, "building_permits");
    if (!fileCheck.success) {
      return { success: false, error: fileCheck.error || "File validation failed." };
    }

    // Sanitize input data to prevent XSS/injection attacks
    const sanitizedAdditionalData = sanitizeObject(additionalData);
    if (additionalData.signature) {
      sanitizedAdditionalData.signature = additionalData.signature;
    }

    const sanitizedResidentSnapshot = resident ? sanitizeObject(resident) : {};

    // Handle Appointment Booking if provided
    let queueNumber = null;
    let isPriority = false;

    if (appointmentDate && appointmentSlot) {
      const config = await prisma.appointmentConfig.findUnique({
        where: { department: "ENGINEERING" }
      }) as any;
      const maxSlotsAM = config?.maxSlotsAM ?? 25;
      const maxSlotsPM = config?.maxSlotsPM ?? 25;

      const startOfDay = new Date(appointmentDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(appointmentDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const bookedCount = await prisma.transaction.count({
        where: {
          appointmentDate: { gte: startOfDay, lte: endOfDay },
          appointmentSlot: appointmentSlot,
          isCancelled: false,
          type: { category: "Engineer" }
        }
      });

      const isAM = appointmentSlot.includes("AM") || appointmentSlot.toUpperCase().includes("08:00 AM");
      const maxLimit = isAM ? maxSlotsAM : maxSlotsPM;

      if (bookedCount >= maxLimit) {
        return { success: false, error: "This appointment slot is already fully booked. Please select another slot." };
      }

      isPriority = sanitizedAdditionalData.isPriorityLane === true || sanitizedAdditionalData.isPriorityLane === "true";

      queueNumber = await generateQueueNumber({
        source: "web",
        isPriority,
        appointmentDate: startOfDay,
        appointmentSlot,
      });
    }

    // Create the transaction (FOR_REQUESTING)
    const transaction = await prisma.transaction.create({
      data: {
        userId: userId,
        typeId: type.id,
        status: "FOR_INSPECTION",
        residentSnapshot: sanitizedResidentSnapshot as any,
        additionalData: sanitizedAdditionalData as any,
        totalAmount: 0,
        appointmentDate: appointmentDate,
        appointmentSlot: appointmentSlot || null,
        queueNumber: queueNumber,
        isPriority: isPriority,
      } as any
    });

    revalidatePath("/user/transactions");
    return { success: true, transactionId: transaction.id };

  } catch (error) {
    console.error("Building Permit Submission Error:", error);
    return { success: false, error: "Failed to submit building permit application." };
  }
}

export async function saveTransactionSignature(transactionId: string, signatureUrl: string) {
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
    additionalData.signature = signatureUrl;

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
    const customLabelsStr = formData.get("customLabels") as string;
    if (customLabelsStr) {
      try {
        additionalData.customLabels = {
          ...(additionalData.customLabels || {}),
          ...JSON.parse(customLabelsStr)
        };
      } catch (e) {
        console.error("Error parsing customLabels in resubmit", e);
      }
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

    const selectedAncillaryStructuresRaw = formData.get("selectedAncillaryStructures") as string;
    if (selectedAncillaryStructuresRaw) {
      try {
        additionalData.selectedAncillaryStructures = JSON.parse(selectedAncillaryStructuresRaw);
      } catch (e) {
        console.error("Error parsing selectedAncillaryStructures in resubmit", e);
      }
    }

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
      } else if (key.startsWith("revision_")) {
         await processFile(key, "revision");
      }
    }

    // Validate magic numbers of all uploaded files in additionalData
    const fileCheck = await validatePayloadFiles(additionalData, "building_permits");
    if (!fileCheck.success) {
      return { success: false, error: fileCheck.error || "File validation failed." };
    }

    // Get current resident data for snapshot update
    const resident = await prisma.resident.findFirst({
      where: { userId: userId }
    });

    // Sanitize input data to prevent XSS/injection attacks
    const sanitizedAdditionalData = sanitizeObject(additionalData);
    if (additionalData.signature) {
      sanitizedAdditionalData.signature = additionalData.signature;
    }

    const sanitizedResidentSnapshot = resident ? sanitizeObject(resident) : {};

    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "FOR_INSPECTION",
        rejectionRemarks: null,
        residentSnapshot: sanitizedResidentSnapshot as any,
        additionalData: sanitizedAdditionalData as any,
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

    // Validate magic numbers of the payment proof file
    const fileCheck = await validatePayloadFiles({ paymentProofUrl });
    if (!fileCheck.success) {
      return { success: false, error: fileCheck.error || "File validation failed." };
    }

    const currentAdditionalData = (transaction.additionalData as any) || {};

    const sanitizedAdditionalData = sanitizeObject({
      ...currentAdditionalData,
      gcashReferenceNo: gcashRefNo ? sanitizeString(gcashRefNo) : (currentAdditionalData.gcashReferenceNo || null)
    });
    if (currentAdditionalData.signature) {
      sanitizedAdditionalData.signature = currentAdditionalData.signature;
    }

    // Clear rejection remarks if any, set payment reference
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymentReference: paymentProofUrl,
        rejectionRemarks: null,
        additionalData: sanitizedAdditionalData as any,
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
        additionalData: true
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
      return { 
        success: true, 
        isProcessing: true, 
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

export async function getEngineeringAppointmentConfig() {
  try {
    let config = await prisma.appointmentConfig.findUnique({
      where: { department: "ENGINEERING" }
    });

    if (!config) {
      config = await prisma.appointmentConfig.create({
        data: {
          department: "ENGINEERING",
          maxSlots: 50,
          maxSlotsAM: 25,
          maxSlotsPM: 25,
          blockedDates: [],
          activeDays: [1, 2, 3, 4, 5]
        } as any
      });
    }

    const bookedSlots = await prisma.transaction.findMany({
      where: {
        appointmentDate: { not: null },
        isCancelled: false,
        type: { category: "Engineer" }
      },
      select: {
        appointmentDate: true,
        appointmentSlot: true
      }
    });

    return { success: true, config, bookedSlots };
  } catch (error) {
    console.error("Error fetching engineering appointment config:", error);
    return { success: false, config: null, bookedSlots: [] };
  }
}
