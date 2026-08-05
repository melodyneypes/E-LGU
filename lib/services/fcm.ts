import { initializeApp, cert, getApps } from "firebase-admin/app";
import type { App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import type { Message } from "firebase-admin/messaging";

/**
 * Lazily initialize Firebase Admin SDK using modern modular imports.
 * Reads credentials from environment variables:
 * - FIREBASE_SERVICE_ACCOUNT_KEY (JSON string)
 * OR
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY
 */
function getFirebaseAdmin(): App | null {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0]!;
  }

  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  let credential;

  if (serviceAccountRaw) {
    try {
      const parsed = JSON.parse(serviceAccountRaw);
      credential = cert(parsed);
    } catch (err) {
      console.error("[FCM Init Error]: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON", err);
    }
  }

  if (!credential) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
    const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, "\n") : undefined;

    if (projectId && clientEmail && privateKey) {
      credential = cert({
        projectId,
        clientEmail,
        privateKey,
      });
    }
  }

  if (!credential) {
    console.warn("[FCM Warning]: Firebase credentials not found in environment variables. FCM notifications will be skipped.");
    return null;
  }

  return initializeApp({ credential });
}

/**
 * Broadcast a push notification to all RHU app users subscribed to the health/RHU topics.
 */
export async function sendRHUAnnouncementNotification(
  title: string,
  body: string,
  extraData?: Record<string, string>
) {
  try {
    const app = getFirebaseAdmin();
    if (!app) return { success: false, error: "Firebase Admin not configured" };

    const messaging = getMessaging(app);

    const safeTitle = title || "Announcement Advisory";
    const safeBody = body || "";
    const formattedBody = safeBody.length > 150 ? safeBody.substring(0, 147) + "..." : safeBody;

    const buildMessage = (topicName: string): Message => ({
      topic: topicName,
      notification: {
        title: `📢 Advisory: ${safeTitle}`,
        body: formattedBody,
      },
      data: {
        type: "ANNOUNCEMENT",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        ...extraData,
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "rhu_high_importance_channel",
          priority: "high",
        },
      },
    });

    const res1 = await messaging.send(buildMessage("rhu_announcements"));
    let res2: string | null = null;
    try {
      res2 = await messaging.send(buildMessage("announcements"));
    } catch (e: any) {
      console.warn("[FCM Warning] Could not send to secondary topic 'announcements':", e?.message);
    }

    console.log("[FCM] Broadcast announcement push notification sent successfully:", res1, res2);
    return { success: true, messageId: res1 };
  } catch (error: any) {
    console.error("[FCM Error] Failed to send announcement notification:", error?.message || error);
    return { success: false, error: String(error?.message || error) };
  }
}

/**
 * Send a direct push notification to an individual user's FCM Token (e.g., appointment status updates).
 */
export async function sendPatientNotification(
  fcmToken: string,
  title: string,
  body: string,
  extraData?: Record<string, string>
) {
  if (!fcmToken) {
    return { success: false, error: "No FCM Token provided" };
  }

  try {
    const app = getFirebaseAdmin();
    if (!app) return { success: false, error: "Firebase Admin not configured" };

    const messaging = getMessaging(app);

    const safeTitle = title || "RHU Update";
    const safeBody = body || "";
    const formattedBody = safeBody.length > 150 ? safeBody.substring(0, 147) + "..." : safeBody;

    const message: Message = {
      token: fcmToken,
      notification: {
        title: safeTitle,
        body: formattedBody,
      },
      data: {
        type: "APPOINTMENT_UPDATE",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        ...extraData,
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          priority: "high",
        },
      },
    };

    const response = await messaging.send(message);
    console.log("[FCM] Patient push notification sent successfully:", response);
    return { success: true, messageId: response };
  } catch (error: any) {
    console.error("[FCM Error] Failed to send patient notification:", error?.message || error);
    return { success: false, error: String(error?.message || error) };
  }
}
