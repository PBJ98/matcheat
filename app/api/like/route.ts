import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { toUserId } = body;

  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: "user not found" }, { status: 404 });

  await prisma.like.upsert({
    where: { fromUserId_toUserId: { fromUserId: me.id, toUserId } },
    update: {},
    create: { fromUserId: me.id, toUserId }
  });

  return NextResponse.json({ ok: true });
}
