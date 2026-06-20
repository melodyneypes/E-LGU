import nodemailer from "nodemailer";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

if (!emailUser || !emailPass) {
    console.error("Missing EMAIL_USER or EMAIL_PASS");
    process.exit(1);
}

const sanitizedPass = emailPass.replace(/\s+/g, "");

const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: emailUser,
        pass: sanitizedPass,
    },
});

async function runTest() {
    try {
        console.log("Verifying connection...");
        await new Promise<void>((resolve, reject) => {
            transporter.verify((error) => {
                if (error) reject(error);
                else resolve();
            });
        });
        console.log("SMTP connection verified successfully!");

        console.log("Sending test email...");
        const info = await transporter.sendMail({
            from: `"LGU Mapandan Test" <nilojhonemil1@gmail.com>`, // Use the sender email verified in Brevo
            to: "nilojhonemil1@gmail.com",
            subject: "EMapandan SMTP Verification Test",
            text: "Hello Jhon! If you are reading this, your Brevo SMTP is sending emails successfully!",
            html: "<b>Hello Jhon!</b><br>If you are reading this, your Brevo SMTP is sending emails successfully!",
        });

        console.log("Message sent successfully!");
        console.log("Message ID:", info.messageId);
        console.log("Response:", info.response);
    } catch (err) {
        console.error("Test failed:", err);
    }
}

runTest();
