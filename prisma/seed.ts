import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const sampleFoods = ['korean','japanese','chinese','western','cafe','bbq','noodle','street'];

function rnd<T>(arr: T[]) { return arr[Math.floor(Math.random()*arr.length)]; }

async function main() {
  // Restaurants (20)
  for (let i=1;i<=20;i++){
    await prisma.restaurant.upsert({
      where: { id: `r_${i}` },
      update: {},
      create: {
        id: `r_${i}`,
        name: `맛집 ${i}`,
        addr: `서울 어딘가 ${i}`,
        category: rnd(sampleFoods),
        priceLevel: 1 + (i % 5),
        lat: 37.5 + Math.random()/10,
        lng: 127.0 + Math.random()/10,
      }
    })
  }

  // Users & Profiles (10)
  for (let i=1;i<=10;i++){
    const email = `demo${i}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: `데모유저${i}`, gender: i%2? 'M':'F', birthYear: 1995 + (i%6) }
    });
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        region: rnd(['서울','경기','인천']),
        mbti: rnd(['ENTP','ISTJ','ENFP','ISFJ']),
        bio: '안녕하세요! 맛집 탐방 좋아해요.',
        budgetMin: 10000 + (i%5)*5000,
        budgetMax: 30000 + (i%5)*5000,
        foodTags: [rnd(sampleFoods), rnd(sampleFoods)],
        timeWindows: [rnd(['weekday-evening','weekend-lunch','weekend-dinner'])]
      }
    });
  }

  console.log('Seeded ✅');
}

main().catch(e=>{console.error(e)}).finally(()=>prisma.$disconnect());
