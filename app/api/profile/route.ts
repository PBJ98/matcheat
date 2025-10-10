import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { profile: true } });
  return NextResponse.json({ user });
}

export async function PUT(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();

  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!me) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const profile = await prisma.profile.upsert({
    where: { userId: me.id },
    create: {
      userId: me.id,
      region: body.region ?? null,
      mbti: body.mbti ?? null,
      bio: body.bio ?? null,
      budgetMin: body.budgetMin ?? null,
      budgetMax: body.budgetMax ?? null,
      foodTags: body.foodTags ?? [],
      timeWindows: body.timeWindows ?? []
    },
    update: {
      region: body.region ?? null,
      mbti: body.mbti ?? null,
      bio: body.bio ?? null,
      budgetMin: body.budgetMin ?? null,
      budgetMax: body.budgetMax ?? null,
      foodTags: body.foodTags ?? [],
      timeWindows: body.timeWindows ?? []
    }
  });

  return NextResponse.json({ profile });
}
