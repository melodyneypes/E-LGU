/**
 * Civil Registry (LCR and PSA) Transaction Fee/Payment Calculator.
 */
export function calculateCivilRegistryFee(
    transaction: any,
    feeLineItems: { label: string; amount: any }[],
    deliveryFeeOverride?: number,
    miscFeeOverride?: number
) {
    if (!transaction) {
        return {
            basicTax: 0,
            additionalTax: 0,
            penalty: 0,
            deliveryFee: 0,
            miscFee: 0,
            totalAmount: 0,
            lineItems: []
        };
    }

    const additional = transaction.additionalData || {};
    const typeCode = transaction.type?.code || "";
    const fiscal = transaction.fiscalSnapshot || null;

    const isLate = (additional.registrationType || "").toUpperCase() === "LATE";
    const isMarriageReg = typeCode === "LCR_MARRIAGE_REG";
    const isMarriageLicense = typeCode === "LCR_MARRIAGE_LICENSE";

    // When status is FOR_REQUESTING, use the standard baseFee from the transaction type
    const baseFee = (transaction.status === "FOR_REQUESTING")
        ? Number(transaction.type?.baseFee || 0)
        : (((isMarriageReg && !isLate) || isMarriageLicense)
            ? 0
            : Number(transaction.type?.baseFee || additional.totalAmount || transaction.totalAmount || 0));

    const typeDelivery = Number(transaction.type?.deliveryFee || 0);
    const deliveryFeeUsed = transaction.fulfillmentType === "DELIVERY"
        ? (fiscal?.deliveryFee ?? deliveryFeeOverride ?? typeDelivery)
        : 0;

    const miscFee = miscFeeOverride !== undefined
        ? miscFeeOverride
        : ((transaction.status === "FOR_REQUESTING")
            ? (additional.miscFee !== undefined ? Number(additional.miscFee) : (isLate ? 300 : 0))
            : (isLate
                ? (additional.miscFee !== undefined ? Number(additional.miscFee) : 300)
                : (isMarriageLicense ? (additional.miscFee !== undefined ? Number(additional.miscFee) : Number(transaction.type?.baseFee || 0)) : 0)));

    const itemsSum = feeLineItems.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    const isAppointment = typeCode.includes("APPOINTMENT");
    const total = (transaction.totalAmount && Number(transaction.totalAmount) > 0 && (transaction.status !== "FOR_REQUESTING" || isAppointment))
        ? Number(transaction.totalAmount)
        : deliveryFeeUsed + miscFee + itemsSum;

    return {
        basicTax: baseFee,
        additionalTax: 0,
        penalty: 0,
        deliveryFee: deliveryFeeUsed,
        miscFee,
        totalAmount: total,
        lineItems: feeLineItems.filter(item => (parseFloat(item.amount) || 0) > 0)
    };
}
