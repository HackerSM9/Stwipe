import admin from "firebase-admin";
import path from "path";

if (!admin.apps.length) {
  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Production: load from env
    credential = admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string)
    );
  } else {
    // Local: load from file
    const serviceAccountPath = path.resolve(__dirname, "firebase-service-account.json");
    credential = admin.credential.cert(serviceAccountPath);
  }

  admin.initializeApp({ credential });
}

export const auth = admin.auth();

export async function verifyIdToken(idToken: string) {
  try {
    return await auth.verifyIdToken(idToken);
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    throw new Error("Invalid authentication token");
  }
}
