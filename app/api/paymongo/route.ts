import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(request: Request) {
    try {
        const { amount, type, reference, transactionId, successUrl, cancelUrl } = await request.json();

        const secret = process.env.PAYMONGO_SECRET_KEY;
        if (!secret) {
            return NextResponse.json({ error: 'PAYMONGO_SECRET_KEY not configured' }, { status: 500 });
        }

        // Encode secret key to Base64 for Basic Auth
        const secretKeyBase64 = Buffer.from(secret + ':').toString('base64');

        const amountNum = Number(amount) || 0;
        const amountCents = Math.round(amountNum * 100);

        const originHeader = request.headers.get('origin');
        const refererHeader = request.headers.get('referer');
        const hostHeader = request.headers.get('host');
        
        let baseUrl = '';
        if (originHeader) {
            baseUrl = originHeader;
        } else if (refererHeader) {
            try {
                baseUrl = new URL(refererHeader).origin;
            } catch {
                baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
            }
        } else if (hostHeader) {
            const protocol = request.headers.get('x-forwarded-proto') || 'http';
            baseUrl = `${protocol}://${hostHeader}`;
        } else {
            baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        }

        const defaultSuccess = transactionId ? `${baseUrl}/user/services/requests/${transactionId}` : `${baseUrl}/user/services/requests`;
        const defaultCancel = transactionId ? `${baseUrl}/user/services/requests/${transactionId}` : `${baseUrl}/user/services/requests`;

        const successRedirect = successUrl || defaultSuccess;
        const failedRedirect = cancelUrl || defaultCancel;

        let paymentMethodTypes = ['gcash'];
        if (type === 'qrph') {
            paymentMethodTypes = ['qrph'];
        } else if (type === 'dob' || type === 'bank_transfer' || type === 'bank') {
            paymentMethodTypes = ['dob', 'dob_ubp'];
        } else if (type === 'grab_pay') {
            paymentMethodTypes = ['grab_pay'];
        } else if (type === 'paymaya' || type === 'maya') {
            paymentMethodTypes = ['paymaya'];
        }

        // Configure dynamic Checkout Session payload to pre-select payment type & force billing info
        const payload: any = {
            data: {
                attributes: {
                    billing_information_required: true, // Forces PayMongo to request billing info before payment
                    payment_method_types: paymentMethodTypes,
                    line_items: [
                        {
                            amount: amountCents,
                            currency: 'PHP',
                            name: reference || 'Document Transaction Payment',
                            quantity: 1
                        }
                    ],
                    success_url: successRedirect,
                    cancel_url: failedRedirect,
                    metadata: {
                        transactionId: transactionId || null,
                        ...(reference ? { reference } : {}),
                        paymentMethod: type || 'gcash'
                    }
                },
            },
        };

        const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${secretKeyBase64}`,
            },
            body: JSON.stringify(payload),
        });

        const raw = await response.text().catch(() => '');
        let data: any = null;
        if (raw) {
            try {
                data = JSON.parse(raw);
            } catch (e) {
                console.warn('PayMongo: non-JSON response', raw?.slice?.(0, 200), e);
                data = { raw };
            }
        }

        if (!response.ok) {
            const errPayload = (data && (data.errors || data.error)) || data || { message: response.statusText };
            return NextResponse.json({ error: errPayload }, { status: response.status });
        }

        // Safely store the generated PayMongo checkoutSessionId inside Transaction additionalData
        if (data?.data?.id && transactionId) {
            try {
                const checkoutSessionId = data.data.id;
                const tx = await prisma.transaction.findUnique({
                    where: { id: transactionId }
                });
                if (tx) {
                    const currentAdditional = (tx.additionalData as any) || {};
                    const updatedAdditional = {
                        ...currentAdditional,
                        paymongo: {
                            ...currentAdditional?.paymongo,
                            checkoutSessionId: checkoutSessionId
                        }
                    };
                    await prisma.transaction.update({
                        where: { id: transactionId },
                        data: {
                            additionalData: updatedAdditional
                        }
                    });
                }
            } catch (dbErr) {
                console.error('Failed to update transaction with PayMongo checkoutSessionId:', dbErr);
            }
        }

        return NextResponse.json(data ?? {});
    } catch (error) {
        console.error('PayMongo route error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}