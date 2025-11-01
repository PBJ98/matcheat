import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin"; // lib/firebaseAdmin.ts 추가

export const runtime = "nodejs";       // 서버 전용
export const dynamic = "force-dynamic"; // 정적 빌드 방지

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const tempPassword = Math.random().toString(36).slice(-8);

    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, { password: tempPassword });

    return NextResponse.json({ success: true, tempPassword });
  } catch (e: any) {
    console.error("sendTempPassword error:", e);
    return NextResponse.json({ error: e?.message ?? "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
