import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Profile = {
  region: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  foodTags: string[];
  timeWindows: string[];
}

function overlapBudget(aMin: number|null, aMax: number|null, bMin: number|null, bMax: number|null) {
  if (aMin === null || aMax === null || bMin === null || bMax === null) return 0;
  const overlap = Math.min(aMax, bMax) - Math.max(aMin, bMin);
  return overlap >= 0 ? 1 : 0;
}

function score(me: Profile, other: Profile) {
  let s = 0;
  if (me.region && other.region) {
    s += me.region === other.region ? 2 : 0;
  }
  s += overlapBudget(me.budgetMin, me.budgetMax, other.budgetMin, other.budgetMax) ? 2 : 0;
  const tagIntersect = me.foodTags.filter(t => other.foodTags.includes(t)).length;
  s += tagIntersect;
  const timeIntersect = me.timeWindows.some(t => other.timeWindows.includes(t));
  s += timeIntersect ? 1 : 0;
  return s;
}

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email: session.user.email }, include: { profile: true } });
  if (!me || !me.profile) return NextResponse.json({ list: [] });

  const candidates = await prisma.user.findMany({
    where: { id: { not: me.id } },
    include: { profile: true }
  });

  const scored = candidates
    .filter(c => c.profile)
    .map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      profile: c.profile,
      score: score(me.profile!, c.profile!)
    }))
    .sort((a,b) => b.score - a.score)
    .slice(0, 10);

  return NextResponse.json({ list: scored });
}
