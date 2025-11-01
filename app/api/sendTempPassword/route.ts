import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import path from "path";

// Firebase Admin 초기화 (중복 초기화 방지)
if (!admin.apps.length) {
  const serviceAccountPath = path.join(process.cwd(), "firebase-admin.json");
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// POST 요청 처리
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid, tempPassword } = body;

    if (!uid || !tempPassword) {
      return NextResponse.json({ error: "uid와 tempPassword가 필요합니다." }, { status: 400 });
    }

    // Firebase Auth 비밀번호 변경
    await admin.auth().updateUser(uid, { password: tempPassword });

    // Firestore에 임시 비밀번호 기록 (선택)
    const userRef = admin.firestore().collection("users").doc(uid);
    await userRef.update({ tempPassword });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("sendTempPassword error:", err);
    return NextResponse.json({ error: err.message || "서버 오류" }, { status: 500 });
  }
}
