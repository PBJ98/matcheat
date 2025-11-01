import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const sendTempPassword = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const { uid, tempPassword } = req.body;
    if (!uid || !tempPassword) return res.status(400).send("Bad Request");

    // Auth 비밀번호 변경
    await admin.auth().updateUser(uid, { password: tempPassword });

    // Firestore에도 기록 (선택)
    const userRef = admin.firestore().collection("users").doc(uid);
    await userRef.update({ tempPassword });

    return res.status(200).send({ success: true });
  } catch (err: any) {
    console.error(err);
    return res.status(500).send(err.message);
  }
});
