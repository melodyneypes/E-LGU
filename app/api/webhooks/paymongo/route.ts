import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

async function verifySignature(header: string | null, secret: string, payload: string) {
  if (!header) return false;

  // Parse header into key/value pairs (e.g. 't=...,te=...,v1=...')
  const rawHeader = header;
  const kv: Record<string, string> = {};
  try {
    const parts = header.split(",").map((p) => p.trim()).filter(Boolean);
    for (const p of parts) {
      const idx = p.indexOf("=");
      if (idx > -1) {
        const k = p.slice(0, idx).trim().toLowerCase();
        const v = p.slice(idx + 1).trim();
        kv[k] = v;
      } else {
        // whole header might just be the signature
        kv["signature"] = p;
      }
    }
  } catch {
    // ignore parsing errors
  }

  const sigCandidates: string[] = [];
  if (kv["v1"]) sigCandidates.push(kv["v1"]);
  if (kv["te"]) sigCandidates.push(kv["te"]);
  if (kv["sig"]) sigCandidates.push(kv["sig"]);
  if (kv["signature"]) sigCandidates.push(kv["signature"]);
  // as last resort include the raw header
  sigCandidates.push(rawHeader);

  const timestamp = kv["t"] || kv["ts"] || "";

  // Try several payload forms: raw body, timestamp-prefixed variants, and normalized JSON
  const variants: string[] = [payload];
  if (timestamp) {
    variants.push(`${timestamp}.${payload}`);
    variants.push(`${timestamp}${payload}`);
    variants.push(`${payload}.${timestamp}`);
  }
  try {
    const parsed = JSON.parse(payload);
    variants.push(JSON.stringify(parsed));
  } catch { }

  for (const variant of variants) {
    const hmac = crypto.createHmac("sha256", secret).update(variant).digest();
    const hex = hmac.toString("hex");
    const b64 = hmac.toString("base64");

    console.log("[PayMongo Webhook] verifySignature try variant length=", variant.length);
    console.log("[PayMongo Webhook] verifySignature computedHex:", hex);
    console.log("[PayMongo Webhook] verifySignature computedBase64:", b64);

    for (const sig of sigCandidates) {
      if (!sig) continue;
      // Try hex compare
      try {
        const sigBufHex = Buffer.from(sig, "hex");
        if (sigBufHex.length === hmac.length && crypto.timingSafeEqual(sigBufHex, hmac)) {
          console.log("[PayMongo Webhook] verifySignature: hex match");
          return true;
        }
      } catch {
        // not hex
      }

      // Try base64 compare
      try {
        const sigBufB64 = Buffer.from(sig, "base64");
        if (sigBufB64.length === hmac.length && crypto.timingSafeEqual(sigBufB64, hmac)) {
          console.log("[PayMongo Webhook] verifySignature: base64 match");
          return true;
        }
      } catch {
        // not base64
      }

      // Fallback string compare
      if (sig === hex || sig === b64 || sig === header) { 
        console.log("[PayMongo Webhook] verifySignature: string fallback match");
        return true;
      }
    }
  }

  console.log("[PayMongo Webhook] verifySignature: no match found among candidates");
  return false;
}

function mapPaymentStatusToPrisma(status?: string) {
  if (!status) return "PENDING";
  const s = status.toLowerCase();

  // Common success statuses from payment providers
  if (
    s.includes("paid") ||
    s.includes("succeed") ||
    s.includes("success") ||
    s.includes("captur") // captured / capture
  ) {
    return "PAID";
  }

  // Common failure statuses
  if (s.includes("fail") || s.includes("declin") || s.includes("error")) {
    return "FAILED";
  }

  return "PENDING";
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();

    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
    
    // In production, signature verification MUST be active. If secret is missing, reject the webhook.
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction && !webhookSecret) {
      console.error("[PayMongo Webhook] Critical Error: PAYMONGO_WEBHOOK_SECRET is missing in production!");
      return NextResponse.json({ error: "Webhook configuration error" }, { status: 400 });
    }

    if (webhookSecret) {
      const sigHeader = request.headers.get("paymongo-signature") || request.headers.get("Paymongo-Signature") || request.headers.get("signature");
      const ok = await verifySignature(sigHeader, webhookSecret, raw);
      if (!ok) {
        console.warn("PayMongo webhook signature verification failed");
        return NextResponse.json({ error: "invalid signature" }, { status: 400 });
      }
    }

    const payload = JSON.parse(raw || "{}") as any;

    // PayMongo webhook envelope: { data: { id: "evt_...", type: "webhook", attributes: { type: "payment.paid", data: { ... } } } }
    // Extract the event type and the nested resource data
    const envelopeData = payload?.data || payload;
    const envelopeAttrs = envelopeData?.attributes || {};
    // PayMongo sometimes uses dot-separated types or underscores; normalize to a consistent form
    const eventTypeRaw = envelopeAttrs?.type || ""; // e.g. "payment.paid", "payment_failed", "checkout_session.payment.paid"
    const eventType = String(eventTypeRaw).replace(/_/g, ".").toLowerCase();

    // The actual resource (payment or source) is nested inside attributes.data
    const resource = envelopeAttrs?.data || envelopeData;
    const rType = resource?.type; // e.g. "payment", "source"
    const attrs = resource?.attributes || {};

    console.log(`[PayMongo Webhook] eventType="${eventTypeRaw}", normalized="${eventType}", rType="${rType}", resourceId="${resource?.id}"`);

    // Helper to extract transactionId from metadata or nested source
    const extractTransactionId = (obj: any): string | undefined => {
      if (!obj) return undefined;
      if (obj.transactionId) return obj.transactionId;
      if (obj.transactionid) return obj.transactionid;
      if (obj.reference) return obj.reference;
      if (obj.metadata && typeof obj.metadata === "object") {
        return obj.metadata.transactionId || obj.metadata.transactionid || obj.metadata.reference;
      }
      if (obj.attributes && obj.attributes.metadata) {
        return obj.attributes.metadata.transactionId || obj.attributes.metadata.transactionid;
      }
      return undefined;
    };

    // Handler for Checkout Session events (PayMongo uses both dot and underscore conventions)
    const normalizedEvent = String(eventType || "").replace(/\./g, "_"); // e.g. checkout_session_payment_paid
    const isCheckoutSessionEvent = normalizedEvent.startsWith("checkout_session") || (rType && String(rType).toLowerCase().includes("checkout")) || String(resource?.id || "").startsWith("cs_");

    if (isCheckoutSessionEvent || (eventType === "payment.paid" && rType === "payment")) {
      const paymentId = resource?.id;
      const payAttrs = attrs || {};
      const paymentStatus = mapPaymentStatusToPrisma(payAttrs?.status);

      // Try metadata on the payment itself, then the payment_intent, then the source
      let transactionId = extractTransactionId(payAttrs) || extractTransactionId(payAttrs?.metadata) || extractTransactionId(payAttrs?.source) || undefined;

      // Also check the checkout session metadata if available
      if (!transactionId && payAttrs?.payment_intent) {
        transactionId = extractTransactionId(payAttrs.payment_intent?.attributes?.metadata) || extractTransactionId(payAttrs.payment_intent);
      }

      // If still no transactionId, try to find it by looking up transactions that have this checkout session ID or other paymongo refs
      if (!transactionId) {
        console.log(`[PayMongo Webhook] No transactionId in metadata, attempting DB lookup by payment reference / checkout session...`);
        // Try to find a transaction by common stored references: paymentReference, paymongo.paymentId, or paymongo.checkoutSessionId
        const txByRef = await prisma.transaction.findFirst({
          where: {
            OR: [
              { paymentReference: paymentId },
              { additionalData: { path: ["paymongo", "paymentId"], equals: paymentId } },
              { additionalData: { path: ["paymongo", "checkoutSessionId"], equals: paymentId } },
              { additionalData: { path: ["paymongo", "checkout_session_id"], equals: paymentId } },
              { additionalData: { path: ["paymongo", "checkout_session"], equals: paymentId } },
            ],
          },
        });
        if (txByRef) {
          transactionId = txByRef.id;
          console.log(`[PayMongo Webhook] Matched transaction by DB lookup: ${transactionId}`);
        } else {
          console.log(`[PayMongo Webhook] DB lookup did not match any transaction for id=${paymentId}`);
          // As a last resort, attempt to fetch the checkout session from PayMongo to see if metadata exists there
          try {
            const secret = process.env.PAYMONGO_SECRET_KEY;
            if (secret && paymentId && String(paymentId).startsWith("cs_")) {
              const auth = Buffer.from(secret + ":").toString("base64");
              const csres = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${paymentId}`, {
                method: "GET",
                headers: { Accept: "application/json", Authorization: `Basic ${auth}` },
              });
              if (csres.ok) {
                const csdata = await csres.json();
                const csMeta = csdata?.data?.attributes?.metadata || {};
                const maybeTx = extractTransactionId(csMeta) || extractTransactionId(csdata?.data);
                if (maybeTx) {
                  transactionId = maybeTx;
                  console.log(`[PayMongo Webhook] Found transactionId in checkout session metadata: ${transactionId}`);
                } else {
                  console.log(`[PayMongo Webhook] No transactionId in checkout session metadata for ${paymentId}`);
                }
              } else {
                console.log(`[PayMongo Webhook] Failed to fetch checkout session ${paymentId}:`, await csres.text());
              }
            }
          } catch (e) {
            console.warn("PayMongo Webhook: error fetching checkout session metadata", e);
          }
        }
      }

      if (!transactionId) {
        console.warn(`[PayMongo Webhook] ${eventType} event but no transactionId found`, JSON.stringify(resource).slice(0, 500));
        return NextResponse.json({ received: true });
      }

      const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
      if (!tx) {
        console.warn(`[PayMongo Webhook] Transaction not found: ${transactionId}`);
        return NextResponse.json({ received: true });
      }

      // Dynamically map PayMongo payment method to Prisma PaymentType enum:
      // GCash & QRPH -> E_PAYMENT
      // dob (direct online banking) / bank transfer -> BANK_TRANSFER
      const paymongoMethod = String(payAttrs?.metadata?.paymentMethod || payAttrs?.source?.type || "").toLowerCase();
      const mappedPrismaMethod = (paymongoMethod.includes("dob") || paymongoMethod.includes("bank")) ? "BANK_TRANSFER" : "E_PAYMENT";

      // Upsert Payment record
      await prisma.payment.upsert({
        where: { transactionId },
        update: {
          amount: (Number(payAttrs?.amount || 0) || 0) / 100,
          method: mappedPrismaMethod as any,
          status: paymentStatus as any,
          reference: paymentId,
          meta: resource,
        },
        create: {
          transactionId,
          amount: (Number(payAttrs?.amount || 0) || 0) / 100,
          method: mappedPrismaMethod as any,
          status: paymentStatus as any,
          reference: paymentId,
          meta: resource,
        },
      });

      const updatedAdditional = { ...(tx.additionalData as any || {}), paymongo: { ...((tx.additionalData as any)?.paymongo || {}), paymentId, lastPayment: resource } };
      const txUpdate: any = { additionalData: updatedAdditional, updatedAt: new Date(), paymentType: mappedPrismaMethod };
      if (paymentStatus === "PAID") {
        txUpdate.status = "PAID";
        txUpdate.isPaid = true;
        txUpdate.paymentReference = paymentId;
      }

      const updatedTx = await prisma.transaction.update({ where: { id: transactionId }, data: txUpdate });
      console.log(`[PayMongo Webhook] ${eventType}: updated transaction`, { transactionId, status: updatedTx.status, paymentReference: updatedTx.paymentReference });

      try { revalidatePath(`/user/services/requests/${transactionId}`); } catch { }
      try { revalidatePath("/user/services/requests"); } catch { }
      try { revalidatePath("/admin/treasury"); } catch { }

      return NextResponse.json({ success: true });
    }

    // Handler when a Source becomes chargeable: create a Payment server-side
    if (rType === "source") {
      const sourceId = resource?.id || attrs?.id;
      const status = attrs?.status;
      if (status === "chargeable") {
        const metadata = attrs?.metadata || {};
        const transactionId = extractTransactionId(metadata);

        if (!transactionId) {
          console.warn("PayMongo webhook: source chargeable but no transactionId metadata", resource);
          return NextResponse.json({ received: true });
        }

        // Determine amount in cents
        let amountCents = attrs?.amount;
        if (!amountCents) {
          const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
          if (!tx) {
            console.warn("PayMongo webhook: transaction not found", transactionId);
            return NextResponse.json({ received: true });
          }
          amountCents = Math.round((Number(tx.totalAmount) || 0) * 100);
        }

        const secret = process.env.PAYMONGO_SECRET_KEY;
        if (!secret) {
          console.error("PAYMONGO_SECRET_KEY not configured");
          return NextResponse.json({ error: "server misconfiguration" }, { status: 500 });
        }

        const auth = Buffer.from(secret + ":").toString("base64");

        const billing: any = {};
        const billingSource = attrs?.billing || {};
        if (billingSource.name) billing.name = billingSource.name;
        if (billingSource.email) billing.email = billingSource.email;
        if (billingSource.phone) billing.phone = billingSource.phone;
        
        if (metadata?.payerName || metadata?.name) billing.name = metadata.payerName || metadata.name;
        if (metadata?.payerEmail || metadata?.email) billing.email = metadata.payerEmail || metadata.email;
        if (metadata?.payerPhone || metadata?.phone) billing.phone = metadata.payerPhone || metadata.phone;

        const paymentPayload: any = {
          data: {
            attributes: {
              amount: Number(amountCents),
              currency: "PHP",
              source: { id: sourceId, type: "source" },
              ...(Object.keys(billing).length > 0 ? { billing } : {})
            },
          },
        };

        const res = await fetch("https://api.paymongo.com/v1/payments", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify(paymentPayload),
        });

        const payData = await res.json();
        if (!res.ok) {
          console.error("PayMongo create payment failed", payData);
          return NextResponse.json({ error: "failed to create payment" }, { status: 500 });
        }

        const payment = payData?.data;
        const payAttrs = payment?.attributes || {};
        const paymentStatus = mapPaymentStatusToPrisma(payAttrs?.status);
        const paymentId = payment?.id || payData?.id || null;

        // Upsert Payment record and update Transaction accordingly
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx) {
          console.warn("PayMongo webhook: transaction not found when creating payment", transactionId);
          return NextResponse.json({ received: true });
        }

        const paymongoMethod = String(metadata?.paymentMethod || attrs?.type || "").toLowerCase();
        const mappedPrismaMethod = (paymongoMethod.includes("dob") || paymongoMethod.includes("bank")) ? "BANK_TRANSFER" : "E_PAYMENT";

        await prisma.payment.upsert({
          where: { transactionId: transactionId },
          update: {
            amount: (Number(payAttrs?.amount || amountCents) || 0) / 100,
            method: mappedPrismaMethod as any,
            status: paymentStatus as any,
            reference: paymentId,
            meta: payData,
          },
          create: {
            transactionId: transactionId,
            amount: (Number(payAttrs?.amount || amountCents) || 0) / 100,
            method: mappedPrismaMethod as any,
            status: paymentStatus as any,
            reference: paymentId,
            meta: payData,
          },
        });

        console.log("PayMongo webhook: upserted payment", { transactionId, paymentId, status: paymentStatus });

        // Update transaction: mark PAID only when paymentStatus === PAID
        const updatedAdditional = { ...(tx.additionalData as any || {}), paymongo: { sourceId, paymentId, lastPayment: payData } };
        const txUpdate: any = { additionalData: updatedAdditional, updatedAt: new Date(), paymentType: mappedPrismaMethod };
        if (paymentStatus === "PAID") {
          txUpdate.status = "PAID";
          txUpdate.isPaid = true;
          txUpdate.paymentReference = paymentId;
        }


        const updatedTx = await prisma.transaction.update({ where: { id: transactionId }, data: txUpdate });
        console.log("PayMongo webhook: updated transaction", { transactionId, status: updatedTx.status, paymentReference: updatedTx.paymentReference });

        // Revalidate pages (include the specific request page so UI shows updated status)
        try { revalidatePath(`/user/services/requests/${transactionId}`); } catch { }
        try { revalidatePath("/user/services/requests"); } catch { }
        try { revalidatePath("/admin/treasury"); } catch { }

        return NextResponse.json({ success: true });
      }
    }

    // Handler for payment events (fallback): update DB if payment was completed
    if (rType === "payment") {
      const paymentId = resource?.id;
      const payAttrs = attrs || {};
      const status = mapPaymentStatusToPrisma(payAttrs?.status);

      // Use shared extractTransactionId helper defined above

      let transactionId = extractTransactionId(payAttrs?.source) || extractTransactionId(payAttrs?.billing) || undefined;

      // If no transactionId, try retrieving source via PayMongo API (requires secret)
      if (!transactionId) {
        const sourceRef = payAttrs?.source || {};
        const sourceId = sourceRef?.id || sourceRef?.data?.id;
        const secret = process.env.PAYMONGO_SECRET_KEY;
        if (sourceId && secret) {
          const auth = Buffer.from(secret + ":").toString("base64");
          try {
            const sres = await fetch(`https://api.paymongo.com/v1/sources/${sourceId}`, {
              method: "GET",
              headers: { Accept: "application/json", Authorization: `Basic ${auth}` },
            });
            const sdata = await sres.json();
            const smeta = sdata?.data?.attributes?.metadata || sdata?.data?.metadata || {};
            transactionId = extractTransactionId(smeta);
          } catch (e) {
            console.warn("PayMongo webhook: failed to retrieve source for payment event", e);
          }
        }
      }

      if (!transactionId) {
        console.warn("PayMongo webhook: payment event but no transactionId found", resource);
        return NextResponse.json({ received: true });
      }

      const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
      if (!tx) return NextResponse.json({ received: true });

      const paymongoMethod = String(payAttrs?.metadata?.paymentMethod || payAttrs?.source?.type || "").toLowerCase();
      const mappedPrismaMethod = (paymongoMethod.includes("dob") || paymongoMethod.includes("bank")) ? "BANK_TRANSFER" : "E_PAYMENT";

      // Upsert Payment record
      await prisma.payment.upsert({
        where: { transactionId: transactionId },
        update: {
          amount: (Number(payAttrs?.amount || 0) || 0) / 100,
          method: mappedPrismaMethod as any,
          status: status as any,
          reference: paymentId,
          meta: resource,
        },
        create: {
          transactionId: transactionId,
          amount: (Number(payAttrs?.amount || 0) || 0) / 100,
          method: mappedPrismaMethod as any,
          status: status as any,
          reference: paymentId,
          meta: resource,
        },
      });

      console.log("PayMongo webhook: upserted payment (payment event)", { transactionId, paymentId, status });

      const updatedAdditional = { ...(tx.additionalData as any || {}), paymongo: { paymentId, lastPayment: resource } };
      const txUpdate: any = { additionalData: updatedAdditional, updatedAt: new Date(), paymentType: mappedPrismaMethod };
      if (status === "PAID") {
        txUpdate.status = "PAID";
        txUpdate.isPaid = true;
        txUpdate.paymentReference = paymentId;
      }

      const updatedTx = await prisma.transaction.update({ where: { id: transactionId }, data: txUpdate });
      console.log("PayMongo webhook: updated transaction (payment event)", { transactionId, status: updatedTx.status, paymentReference: updatedTx.paymentReference });

      try { revalidatePath(`/user/services/requests/${transactionId}`); } catch { }
      try { revalidatePath("/user/services/requests"); } catch { }
      try { revalidatePath("/admin/treasury"); } catch { }

      return NextResponse.json({ success: true });
    }

    // Default: acknowledge
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayMongo webhook handler error:", error);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
