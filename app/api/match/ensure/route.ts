import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { otherUserId } = body;

  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: "user not found" }, { status: 404 });

  // 상호 좋아요 확인
  const likedMe = await prisma.like.findUnique({
    where: { fromUserId_toUserId: { fromUserId: otherUserId, toUserId: me.id } }
  });
  const iLiked = await prisma.like.findUnique({
    where: { fromUserId_toUserId: { fromUserId: me.id, toUserId: otherUserId } }
  });
  if (!likedMe || !iLiked) return NextResponse.json({ matched: false });

  // 매치 생성/유지
  const [a, b] = me.id < otherUserId ? [me.id, otherUserId] : [otherUserId, me.id];
  const match = await prisma.match.upsert({
    where: { userAId_userBId: { userAId: a, userBId: b } },
    update: {},
    create: { userAId: a, userBId: b }
  });

  return NextResponse.json({ matched: true, matchId: match.id });
}
