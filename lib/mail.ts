import nodemailer from "nodemailer";
import { getSystemSetting } from "./settings";


interface SendEmailProps {
    type: "APPROVED" | "REJECTED" | "FOR_CLAIM" | "FOR_PAYMENT" | "RELEASED" | "DEACTIVATED" | "IN_ROUTE" | "NEW_PICKUP_ALERT" | "DISPUTE_APPROVED" | "DISPUTE_REJECTED" | "FOR_REVISION" | "PASSWORD_RESET" | "PROCESSING" | "FOR_PROCESSING" | "FOR_INSPECTION" | "FOR_REINSPECTION" | "EVALUATED" | "FOR_PICKING" | "UNPAID" | "PAID" | "COMMUNITY_REPORT_SUBMITTED";
    to: string;
    name: string;
    remarks?: string | null;
    transactionId?: string;
    amount?: number;
    resetLink?: string;
    serviceName?: string;
}

/**
 * Centered Email Utility for LGU ${municipalityName}
 * Reuses existing Gmail SMTP configuration from .env
 */
export async function sendEmail({ type, to, name, remarks, transactionId, amount, resetLink, serviceName }: SendEmailProps) {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const senderEmail = process.env.SENDER_EMAIL || emailUser;

    if (!emailUser || !emailPass) {
        console.warn("Skipping email: EMAIL_USER or EMAIL_PASS not configured in .env");
        return { success: false, error: "Gmail SMTP credentials not configured." };
    }

    console.log(`[MAIL] Sending email of type: ${type} to: ${to}`);

    const municipalityName = await getSystemSetting("brand_word_2", "");
    let subject = "Municipal Notification"; // Default fallback subject
    let htmlBody = "";

    // Design Tokens
    const primaryGreen = "#22c55e";
    const primaryRed = "#ef4444";
    const primaryBlue = "#3b82f6";

    if (type === "APPROVED") {
        subject = `Your Registration Has Been Approved - LGU ${municipalityName}`;
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryGreen}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">✓</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Registration Approved</h1>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">We are pleased to inform you that your resident registration with the <strong>${municipalityName}</strong> Local Government Unit has been <strong style="color: ${primaryGreen};">officially approved</strong>.</p>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 24px; margin: 32px 0; text-align: center;">
                    <p style="color: #166534; font-size: 14px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">Access Granted</p>
                    <p style="color: #166534; font-size: 13px; margin: 8px 0 0 0; opacity: 0.8;">You can now access all digital resident services through the portal.</p>
                </div>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Resident Services Portal • Automated Notification</p>
            </div>
        </div>`;
    } else if (type === "REJECTED") {
        const docName = serviceName || "Community Tax Certificate - Individual";
        if (transactionId) {
            subject = `Update on Your Request for ${docName} - LGU ${municipalityName}`;
            htmlBody = `
            <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
                <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <div style="width: 64px; height: 64px; background: ${primaryRed}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                            <span style="color: white; font-size: 32px;">✗</span>
                        </div>
                        <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Request Declined</h1>
                    </div>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6;">After careful review, your request for <strong>${docName}</strong> (Ref ID: <strong style="font-family: monospace;">${transactionId}</strong>) could not be approved at this time.</p>
                    ${remarks ? `
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 24px; margin: 32px 0;">
                        <p style="color: #991b1b; font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.05em;">Reason for Rejection</p>
                        <p style="color: #7f1d1d; font-size: 14px; margin: 0; line-height: 1.5;">${remarks}</p>
                    </div>` : ""}
                    <p style="color: #64748b; font-size: 13px;">Please re-submit your application with the corrected information to proceed.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                    <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Resident Services Portal • Automated Notification</p>
                </div>
            </div>`;
        } else {
            subject = `Update on Your Registration Request - LGU ${municipalityName}`;
            htmlBody = `
            <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
                <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <div style="width: 64px; height: 64px; background: ${primaryRed}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                            <span style="color: white; font-size: 32px;">✗</span>
                        </div>
                        <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Registration Update</h1>
                    </div>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6;">After careful review, your resident registration request could not be approved at this time.</p>
                    ${remarks ? `
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 24px; margin: 32px 0;">
                        <p style="color: #991b1b; font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.05em;">Reason for Rejection</p>
                        <p style="color: #7f1d1d; font-size: 14px; margin: 0; line-height: 1.5;">${remarks}</p>
                    </div>` : ""}
                    <p style="color: #64748b; font-size: 13px;">Please re-submit your application with the corrected information to proceed.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                    <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Resident Services Portal • Automated Notification</p>
                </div>
            </div>`;
        }
    } else if (type === "FOR_REVISION") {
        const primaryAmber = "#f59e0b";
        const docName = serviceName || "Community Tax Certificate - Individual";
        subject = `Action Required: Revision Needed for ${docName} - LGU ${municipalityName}`;
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryAmber}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">⚠️</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Revision Required</h1>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Your service request for <strong>${docName}</strong> (Ref: <strong style="font-family: monospace;">${transactionId || "N/A"}</strong>) requires some corrections or additional documents before we can proceed.</p>
                ${remarks ? `
                <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 16px; padding: 24px; margin: 32px 0;">
                    <p style="color: #b45309; font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.05em;">Admin Remarks (What to Fix)</p>
                    <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">${remarks}</p>
                </div>` : ""}
                <p style="color: #64748b; font-size: 13px;">Please log in to your account, go to "My Requests", and resubmit the required corrections. <strong>This does not count as a rejection strike.</strong></p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Treasury Department • Automated Notification</p>
            </div>
        </div>`;
    } else if (type === "FOR_PAYMENT") {
        const docName = serviceName || "Community Tax Certificate - Individual";
        subject = `Action Required: Assessment Complete for ${docName} - LGU ${municipalityName}`;
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryBlue}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">💳</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Payment Ready</h1>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Good news! Your service request for <strong>${docName}</strong> has been successfully evaluated by the Municipal Treasury Office. You may now proceed to payment to finalize your application.</p>
                
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 24px; margin: 32px 0; text-align: center;">
                    <p style="color: #1e40af; font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.05em;">Final Assessment</p>
                    <p style="color: #1e40af; font-size: 36px; font-weight: 900; margin: 0; letter-spacing: -0.04em;">₱${amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</p>
                    <p style="color: #3b82f6; font-size: 11px; margin: 8px 0 0 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Reference ID: ${transactionId || "N/A"}</p>
                </div>

                ${remarks ? `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin: 32px 0;">
                    <p style="color: #475569; font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.05em;">Treasury Officer's Remarks / Assessment Notes</p>
                    <p style="color: #0f172a; font-size: 14px; margin: 0; line-height: 1.5; font-style: italic;">"${remarks}"</p>
                </div>` : ""}

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 32px;">
                    <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.5;">
                        <strong>Next Step:</strong> Log in to the Resident Portal, navigate to <strong>"My Requests"</strong>, and select your preferred payment and fulfillment method.
                    </p>
                </div>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Treasury Department • Automated Notification</p>
            </div>
        </div>`;
    } else if (type === "FOR_CLAIM") {
        const docName = serviceName || "Community Tax Certificate - Individual";
        const subjectDocName = serviceName || "Community Tax Certificate - Individual";
        subject = `Ready for Claiming: Your ${subjectDocName} is Prepared - LGU ${municipalityName}`;
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryBlue}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">🎫</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Document Ready for Claiming</h1>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">We are pleased to inform you that your <strong>${docName}</strong> has been processed and is now <strong style="color: ${primaryBlue};">READY FOR CLAIMING</strong> at the Municipal Treasury Office.</p>
                
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 24px; margin: 32px 0;">
                    <p style="color: #1e40af; font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 0 0 12px 0; letter-spacing: 0.05em;">Claiming Details</p>
                    <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                        <tr>
                            <td style="color: #64748b; padding: 4px 0;">Location:</td>
                            <td style="color: #1e293b; font-weight: 700; padding: 4px 0;">Municipal Treasury Office, ${municipalityName}</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; padding: 4px 0;">Schedule:</td>
                            <td style="color: #1e293b; font-weight: 700; padding: 4px 0;">Mon - Fri, 8:00 AM - 5:00 PM</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; padding: 4px 0;">Reference:</td>
                            <td style="color: #3b82f6; font-weight: 800; font-family: monospace; padding: 4px 0;">${transactionId || "N/A"}</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; padding: 4px 0;">Amount to Pay:</td>
                            <td style="color: #1e293b; font-weight: 800; padding: 4px 0; font-size: 16px;">₱${amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</td>
                        </tr>
                    </table>
                </div>

                <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px; margin-bottom: 32px;">
                    <p style="color: #92400e; font-size: 13px; margin: 0;"><strong>Note:</strong> Please bring a valid ID and the exact amount for your payment as computed in the portal.</p>
                </div>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Treasury Department • Automated Notification</p>
            </div>
        </div>`;
    } else if (type === "RELEASED") {
        const docName = serviceName || "Community Tax Certificate - Individual";
        const subjectDocName = serviceName || "Community Tax Certificate - Individual";
        subject = `Document Released: Your ${subjectDocName} is Ready - LGU ${municipalityName}`;
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryGreen}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">📄</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Document Officially Released</h1>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Your <strong>${docName}</strong> has been successfully processed and <strong style="color: ${primaryGreen};">OFFICIALLY RELEASED</strong> by the Municipal Treasury Office.</p>
                
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 24px; margin: 32px 0; text-align: center;">
                    <p style="color: #166534; font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.05em;">Digital Record Protocol</p>
                    <p style="color: #166534; font-size: 18px; font-weight: 900; margin: 0; letter-spacing: 0.1em;">REF: ${transactionId || "N/A"}</p>
                </div>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Treasury Department • Official Release Notice</p>
            </div>
        </div>`;
    } else if (type === "DEACTIVATED") {
        subject = `URGENT: Account Deactivated - LGU ${municipalityName}`;
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 10px 30px rgba(239, 68, 68, 0.1); border: 1px solid #fee2e2;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryRed}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">⚠️</span>
                    </div>
                    <h1 style="color: #991b1b; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Account Deactivated</h1>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Our system has detected multiple rejections associated with your service requests. As part of our anti-spam and security protocols, your account has been <strong style="color: ${primaryRed};">AUTOMATICALLY DEACTIVATED</strong>.</p>
                
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 24px; margin: 32px 0;">
                    <p style="color: #991b1b; font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.05em;">Action Required</p>
                    <p style="color: #7f1d1d; font-size: 14px; margin: 0; line-height: 1.5;">To reactivate your account, please personally visit the <strong>Municipal Treasury Office</strong> for identity verification and account restoration.</p>
                </div>

                <p style="color: #64748b; font-size: 13px;">Please bring a valid Government ID for authentication. Access to all digital services is suspended until further notice.</p>
                
                <hr style="border: none; border-top: 1px solid #fecaca; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Security Protocol • Security Alert</p>
            </div>
        </div>`;
    } else if (type === "IN_ROUTE") {
        const docName = serviceName || "Community Tax Certificate - Individual";
        const subjectDocName = serviceName || "Community Tax Certificate - Individual";
        subject = `🚚 On the Way: Your ${subjectDocName} is Out for Delivery! - LGU ${municipalityName}`;
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryBlue}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">🚚</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Delivery in Progress</h1>
                    <p style="color: #3b82f6; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 8px;">Your Rider is on the way!</p>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Good news! Your requested document <strong>${docName}</strong> (Ref: <strong style="font-family: monospace;">${transactionId || "N/A"}</strong>) has been picked up by our municipal logistics fleet and is now <strong style="color: ${primaryBlue};">ON THE WAY</strong> to your registered address.</p>
                
                <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 16px; padding: 24px; margin: 32px 0;">
                    <p style="color: #0369a1; font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 0 0 12px 0; letter-spacing: 0.05em;">Payment Information</p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #0c4a6e; font-size: 14px; font-weight: 600;">Total Amount:</span>
                        <span style="color: #0369a1; font-size: 24px; font-weight: 900;">₱${amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</span>
                    </div>
                    <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 12px; margin-top: 16px;">
                        <p style="color: #92400e; font-size: 12px; margin: 0; font-weight: 700; text-align: center;">
                            💡 REMINDER: Please prepare the EXACT AMOUNT for a faster and contactless-ready transaction.
                        </p>
                    </div>
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 32px;">
                    <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.5;">
                        <strong>Driver Note:</strong> Our rider will contact you via phone once they arrive at your location or if they need assistance finding your landmark.
                    </p>
                </div>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Municipal Logistics • Automated Notification</p>
            </div>
        </div>`;
    } else if (type === "NEW_PICKUP_ALERT") {
        subject = `📦 New Delivery Job Alert - LGU ${municipalityName}`;
        console.log(`[MAIL] Setting subject for NEW_PICKUP_ALERT: ${subject}`);
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryGreen}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">📦</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">New Pickup Ready</h1>
                    <p style="color: ${primaryGreen}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 8px;">Logistics Fleet Notification</p>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">There is a new document ready for pickup and delivery at the <strong>Municipal Treasury Office</strong>.</p>
                
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 24px; margin: 32px 0;">
                    <p style="color: #166534; font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 0 0 12px 0; letter-spacing: 0.05em;">Job Details</p>
                    <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                        <tr>
                            <td style="color: #64748b; padding: 4px 0;">Pickup Point:</td>
                            <td style="color: #1e293b; font-weight: 700; padding: 4px 0;">Municipal Treasury Office</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; padding: 4px 0;">Transaction ID:</td>
                            <td style="color: #166534; font-weight: 800; font-family: monospace; padding: 4px 0;">${transactionId || "N/A"}</td>
                        </tr>
                    </table>
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 32px;">
                    <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.5;">
                        <strong>Instructions:</strong> Please log in to your Rider App to accept this job and scan the waybill QR code to begin delivery.
                    </p>
                </div>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Municipal Logistics • Fleet Dispatch System</p>
            </div>
        </div>`;
    } else if (type === "DISPUTE_APPROVED") {
        const docName = serviceName || "Community Tax Certificate - Individual";
        subject = `Update: Your ${docName} Request is Being Re-processed - LGU ${municipalityName}`;
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryGreen}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">🔄</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Request Approved</h1>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Your recent return/refund request for <strong>${docName}</strong> (Transaction ID <strong style="font-family: monospace;">${transactionId || "N/A"}</strong>) has been <strong>APPROVED</strong> by the Municipal Treasury Office.</p>
                
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 24px; margin: 32px 0; text-align: center;">
                    <p style="color: #166534; font-size: 14px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">Status: Re-processing</p>
                    <p style="color: #166534; font-size: 13px; margin: 8px 0 0 0; opacity: 0.8;">Our staff is now preparing your corrected document. You will receive another update once it's ready for pick-up or delivery.</p>
                </div>

                ${remarks ? `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 32px;">
                    <p style="color: #475569; font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.05em;">Resolution Remarks</p>
                    <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.5;">${remarks}</p>
                </div>` : ""}

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Treasury Department • Official Notification</p>
            </div>
        </div>`;
    } else if (type === "PASSWORD_RESET") {
        subject = `Password Reset Request - LGU ${municipalityName}`;
        const primaryIndigo = "#6366f1";
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryIndigo}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">🔑</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Password Reset</h1>
                    <p style="color: #64748b; font-size: 13px; margin: 8px 0 0 0;">LGU ${municipalityName} Resident Portal</p>
                </div>

                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">We received a request to reset the password for your account. Click the button below to set a new password.</p>

                <div style="text-align: center; margin: 40px 0;">
                    <a href="${resetLink || '#'}" style="display: inline-block; background: ${primaryIndigo}; color: white; text-decoration: none; padding: 16px 40px; border-radius: 14px; font-size: 15px; font-weight: 800; letter-spacing: -0.01em; box-shadow: 0 10px 30px rgba(99,102,241,0.3);">Reset My Password</a>
                </div>

                <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 16px; padding: 20px; margin: 32px 0;">
                    <p style="color: #92400e; font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 0.05em;">⏱ Important: Link expires in 15 minutes</p>
                    <p style="color: #78350f; font-size: 13px; margin: 0; line-height: 1.5;">If you did not request a password reset, you can safely ignore this email. Your password will not be changed.</p>
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 32px;">
                    <p style="color: #64748b; font-size: 12px; margin: 0 0 6px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">If the button doesn't work, copy this link:</p>
                    <p style="color: ${primaryIndigo}; font-size: 12px; margin: 0; word-break: break-all; font-family: monospace;">${resetLink || ''}</p>
                </div>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Resident Services Portal • Security Notification</p>
            </div>
        </div>`;
    } else if (type === "DISPUTE_REJECTED") {
        const docName = serviceName || "Community Tax Certificate - Individual";
        subject = `Update: Resolution Notice for ${docName} - LGU ${municipalityName}`;
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryRed}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">✕</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Request Declined</h1>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">This is to inform you that your recent request (Return/Refund) for <strong>${docName}</strong> (Transaction ID <strong style="font-family: monospace;">${transactionId || "N/A"}</strong>) has been <strong>DECLINED</strong> after further review by the Municipal Treasury Office.</p>
                
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 24px; margin: 32px 0;">
                    <p style="color: #991b1b; font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.05em;">Reason for Decision</p>
                    <p style="color: #7f1d1d; font-size: 14px; margin: 0; line-height: 1.5;">${remarks || "No additional remarks provided."}</p>
                </div>

                <p style="color: #64748b; font-size: 13px;">The original transaction record remains final. If you have further questions, please visit the Municipal Treasury Office personally.</p>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Treasury Department • Official Notification</p>
            </div>
        </div>`;
    } else if (type === "PROCESSING") {
        const docName = serviceName || "Community Tax Certificate - Individual";
        subject = `Update: Your ${docName} Request is now in Process - LGU ${municipalityName}`;
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryBlue}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">⚙️</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Request in Process</h1>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">We would like to inform you that your request for **${serviceName || "Service"}** (Ref ID: <strong style="font-family: monospace;">${transactionId || "N/A"}</strong>) is now being officially processed by LGU ${municipalityName}.</p>
                
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 24px; margin: 32px 0; text-align: center;">
                    <p style="color: #1e40af; font-size: 14px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">Current Status: Processing</p>
                    <p style="color: #1e40af; font-size: 13px; margin: 8px 0 0 0; opacity: 0.8;">Your request is currently being processed by our office. We will send you another update once it is ready or if we need further details.</p>
                </div>

                ${remarks ? `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 32px;">
                    <p style="color: #475569; font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.05em;">Assessor Notes</p>
                    <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.5; font-style: italic;">"${remarks}"</p>
                </div>` : ""}

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} • Official Notification</p>
            </div>
        </div>`;
    } else if (type === "FOR_REINSPECTION" && serviceName?.toLowerCase().includes("business")) {
        subject = `Payment Confirmed & BPLO Verification in Progress - LGU ${municipalityName}`;
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryGreen}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">✓</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Payment Received</h1>
                    <p style="color: ${primaryGreen}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 8px;">Treasury Verification Complete</p>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">This is to officially confirm that the Municipal Treasury Office of ${municipalityName} has received your payment for the **${serviceName}** application (Ref ID: <strong style="font-family: monospace;">${transactionId || "N/A"}</strong>).</p>
                
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 24px; margin: 32px 0;">
                    <p style="color: #166534; font-size: 14px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">Status: BPLO Verification</p>
                    <p style="color: #166534; font-size: 13px; margin: 8px 0 0 0; opacity: 0.8;">Your application has been successfully advanced to the Business Permits and Licensing Office (BPLO) for final validation. Your permit will be processed once BPLO finishes their secondary verification.</p>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Treasury Department • Official Notification</p>
            </div>
        </div>`;
    } else if (type === "FOR_INSPECTION" || type === "FOR_REINSPECTION") {
        const primaryAmber = "#f59e0b";
        const inspectionType = type === "FOR_REINSPECTION" ? "Re-inspection" : "Inspection";
        subject = `Update: ${inspectionType} Scheduled - LGU ${municipalityName}`;
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryAmber}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">🔎</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">For ${inspectionType}</h1>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Your request for **${serviceName || "Building Permit"}** (Ref ID: <strong style="font-family: monospace;">${transactionId || "N/A"}</strong>) has been queued for ${inspectionType.toLowerCase()} by the Municipal Engineering Office.</p>
                
                <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 16px; padding: 24px; margin: 32px 0; text-align: center;">
                    <p style="color: #b45309; font-size: 14px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">Current Status: ${inspectionType}</p>
                    <p style="color: #b45309; font-size: 13px; margin: 8px 0 0 0; opacity: 0.8;">Our engineers will visit your site. Please ensure that all necessary documents and personnel are available on site during the inspection.</p>
                </div>

                ${remarks ? `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 32px;">
                    <p style="color: #475569; font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.05em;">Engineer's Notes / Schedule</p>
                    <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.5; font-style: italic;">"${remarks}"</p>
                </div>` : ""}

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Engineering Office • Official Notification</p>
            </div>
        </div>`;
    } else if (type === "EVALUATED") {
        subject = `Update: Assessment Complete - LGU ${municipalityName}`;
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryBlue}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">📋</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Evaluation Complete</h1>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Good news! Your request for **${serviceName || "Building Permit"}** has been successfully evaluated by the Municipal Engineering Office.</p>
                
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 24px; margin: 32px 0; text-align: center;">
                    <p style="color: #1e40af; font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.05em;">Final Assessment</p>
                    <p style="color: #1e40af; font-size: 36px; font-weight: 900; margin: 0; letter-spacing: -0.04em;">₱${amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</p>
                    <p style="color: #3b82f6; font-size: 11px; margin: 8px 0 0 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Reference ID: ${transactionId || "N/A"}</p>
                </div>

                ${remarks ? `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin: 32px 0;">
                    <p style="color: #475569; font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.05em;">Engineer's Remarks / Assessment Notes</p>
                    <p style="color: #0f172a; font-size: 14px; margin: 0; line-height: 1.5; font-style: italic;">"${remarks}"</p>
                </div>` : ""}

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Engineering Office • Automated Notification</p>
            </div>
        </div>`;
    } else if (type === "UNPAID") {
        subject = `Action Required: Pending Payment - LGU ${municipalityName}`;
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryRed}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">💳</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Payment Required</h1>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Your application for **${serviceName || "Building Permit"}** has been evaluated and is now awaiting payment to proceed with the release.</p>
                
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 24px; margin: 32px 0; text-align: center;">
                    <p style="color: #991b1b; font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.05em;">Amount Due</p>
                    <p style="color: #991b1b; font-size: 36px; font-weight: 900; margin: 0; letter-spacing: -0.04em;">₱${amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</p>
                    <p style="color: #dc2626; font-size: 11px; margin: 8px 0 0 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Reference ID: ${transactionId || "N/A"}</p>
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 32px;">
                    <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.5;">
                        <strong>Next Step:</strong> Please log in to the Resident Portal to choose your preferred payment method, or proceed to the Municipal Treasury Office to settle your dues.
                    </p>
                </div>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Treasury Department • Automated Notification</p>
            </div>
        </div>`;
    } else if (type === "PAID") {
        subject = `Payment Confirmation Received - LGU ${municipalityName}`;
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryGreen}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">✔️</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Payment Confirmed</h1>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">We have successfully received and verified your payment for **${serviceName || "Building Permit"}** (Ref ID: <strong style="font-family: monospace;">${transactionId || "N/A"}</strong>).</p>
                
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 24px; margin: 32px 0; text-align: center;">
                    <p style="color: #166534; font-size: 14px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">Payment Details</p>
                    <p style="color: #166534; font-size: 24px; font-weight: 900; margin: 8px 0;">₱${amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</p>
                    <p style="color: #15803d; font-size: 13px; margin: 0; opacity: 0.8;">Your document will now be prepared for release or delivery depending on your chosen method.</p>
                </div>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} Treasury Department • Official Receipt Notification</p>
            </div>
        </div>`;
    } else if (type === "FOR_PICKING") {
        subject = `Action Required: Document Printing/Preparation - LGU ${municipalityName}`;
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryBlue}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">🖨️</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Document Preparation</h1>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Your document for **${serviceName || "Building Permit"}** is now being finalized and printed by our staff.</p>
                
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 24px; margin: 32px 0; text-align: center;">
                    <p style="color: #1e40af; font-size: 14px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">Current Status: For Picking/Printing</p>
                    <p style="color: #1e40af; font-size: 13px; margin: 8px 0 0 0; opacity: 0.8;">We will notify you again once it is ready for release or out for delivery.</p>
                </div>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">${municipalityName} • Automated Notification</p>
            </div>
        </div>`;
    } else if (type === "COMMUNITY_REPORT_SUBMITTED") {
        subject = `Community Report Filed Successfully - LGU ${municipalityName}`;
        htmlBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: ${primaryBlue}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-size: 32px;">📋</span>
                    </div>
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">Report Received</h1>
                    <p style="color: #3b82f6; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 8px;">Community Concern Submission</p>
                </div>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">Dear <strong>${name}</strong>,</p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">We have successfully received your community concern under the category <strong>${serviceName || "General Concern"}</strong>.</p>
                
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 24px; margin: 32px 0;">
                    <p style="color: #1e40af; font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 0 0 12px 0; letter-spacing: 0.05em;">Timeline & Resolution Protocol</p>
                    <p style="color: #1e293b; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                        Our barangay administration team will check your report. If the concern can be resolved within the resources and authority of our barangay staff, they will take direct action to address it. If the issue requires higher level authorization or additional resources, the report will be escalated to the municipal admin for resolution.
                    </p>
                    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 12px; text-align: center;">
                        <p style="color: #92400e; font-size: 13px; margin: 0; font-weight: 700;">
                            Standard professional assessment and review concludes within 3-5 business days.
                        </p>
                    </div>
                </div>

                <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
                    You can track the live status updates of your report at any time by logging in to the Resident Portal dashboard.
                </p>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">LGU ${municipalityName} Community Services • Automated Notification</p>
            </div>
        </div>`;
    }

    try {
        // Automatically sanitize the Google App Password by removing any spaces
        const sanitizedPass = emailPass.replace(/\s+/g, "");

        // Configure custom SMTP transport (Brevo / Sendinblue)
        const transporter = nodemailer.createTransport({
            host: "smtp-relay.brevo.com",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: emailUser,
                pass: sanitizedPass,
            },
        });

        const mailOptions = {
            from: `"LGU ${municipalityName}" <${senderEmail}>`,
            to: to,
            subject,
            html: htmlBody,
        };

        const info = await transporter.sendMail(mailOptions);

        console.log(`Email (${type}) sent successfully to ${to}: ${info.messageId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Gmail SMTP execution failed:", error);
        return { success: false, error: error.message || "Failed to send email." };
    }
}
