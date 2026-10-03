import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface EmailPayload {
    type: "APPROVED" | "REJECTED";
    recipientEmail: string;
    recipientName: string;
    remarks: string | null;
}

serve(async (req) => {
    if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    const payload: EmailPayload = await req.json();
    const { type, recipientEmail, recipientName, remarks } = payload;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL");
    const MUNICIPALITY_NAME = Deno.env.get("MUNICIPALITY_NAME");

    if (!RESEND_API_KEY) {
        console.error("RESEND_API_KEY not set");
        return new Response(JSON.stringify({ error: "Email service not configured" }), { status: 500 });
    }
    if (!FROM_EMAIL || !MUNICIPALITY_NAME) {
        console.error("FROM_EMAIL and MUNICIPALITY_NAME must be configured");
        return new Response(JSON.stringify({ error: "Email sender is not configured" }), { status: 500 });
    }

    const isApproved = type === "APPROVED";

    const subject = isApproved
        ? `Your Registration Has Been Approved - ${MUNICIPALITY_NAME} Portal`
        : `Update on Your Registration Request - ${MUNICIPALITY_NAME} Portal`;

    const htmlBody = isApproved
        ? `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: #22c55e; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">✓</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.5px;">Registration Approved</h1>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.7;">Dear <strong style="color: #0f172a;">${recipientName}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.7;">
                    We are pleased to inform you that your resident registration with the <strong>${MUNICIPALITY_NAME}</strong> Local Government Unit has been <strong style="color: #22c55e;">officially approved</strong>.
                </p>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <p style="color: #166534; font-size: 14px; font-weight: 600; margin: 0;">You can now access all resident services through the portal using your registered email and password.</p>
                </div>
                <p style="color: #475569; font-size: 14px; line-height: 1.7;">If you have any questions, please do not hesitate to contact the ${MUNICIPALITY_NAME} Municipal Hall.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">This is an automated message from the ${MUNICIPALITY_NAME} Digital Portal. Please do not reply to this email.</p>
            </div>
        </div>`
        : `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: #ef4444; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">✗</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.5px;">Registration Update</h1>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.7;">Dear <strong style="color: #0f172a;">${recipientName}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.7;">
                    After careful review, your resident registration request could not be approved at this time.
                </p>
                ${remarks ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <p style="color: #991b1b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px 0;">Reason for Rejection</p>
                    <p style="color: #7f1d1d; font-size: 14px; line-height: 1.7; margin: 0;">${remarks}</p>
                </div>` : ""}
                <p style="color: #475569; font-size: 15px; line-height: 1.7;">
                    You may visit the Municipal Hall for further assistance or to re-submit your registration with the correct information.
                </p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">This is an automated message from the ${MUNICIPALITY_NAME} Digital Portal. Please do not reply to this email.</p>
            </div>
        </div>`;

    try {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: `${MUNICIPALITY_NAME} Portal <${FROM_EMAIL}>`,
                to: [recipientEmail],
                subject,
                html: htmlBody,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("Resend error:", err);
            return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500 });
        }

        const data = await res.json();
        return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    } catch (err) {
        console.error("Edge function error:", err);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
});
