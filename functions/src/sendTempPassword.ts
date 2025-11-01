import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const sendTempPassword = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { email } = req.body;

    if (!email) {
      res.status(400).send("Missing email");
      return;
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    await admin.auth().updateUser(email, { password: tempPassword });

    res.status(200).send(`Temporary password sent to ${email}`);
  } catch (error) {
    console.error("Error sending temp password:", error);
    res.status(500).send("Internal Server Error");
  }
});

