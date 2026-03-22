const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding...')
  const hash = (pw) => bcrypt.hashSync(pw, 10)

  // ─── Communities ─────────────────────────────────────────
  const comA = await prisma.community.upsert({
    where:  { domain: 'comA.com' },
    update: {},
    create: { id: 'community-a', name: 'บ้านท้วยทราม', domain: 'comA.com', description: 'ชุมชนบันทึกความรู้ท้องถิ่น' },
  })
  const comB = await prisma.community.upsert({
    where:  { domain: 'comB.com' },
    update: {},
    create: { id: 'community-b', name: 'ชุมชนไทดำ', domain: 'comB.com', description: 'ชุมชนภาษาไทดำ' },
  })

  // ─── Users (ไม่มี communityId แล้ว) ─────────────────────
  const userSomjai = await prisma.user.upsert({
    where:  { email: 'admin@noda.com' },
    update: {},
    create: { name: 'สมใจ ยอดเขา', email: 'admin@noda.com', password: hash('admin1234') },
  })
  const userMarie = await prisma.user.upsert({
    where:  { email: 'marie@noda.com' },
    update: {},
    create: { name: 'มารี วงศ์คำ', email: 'marie@noda.com', password: hash('user1234') },
  })
  const userPrasert = await prisma.user.upsert({
    where:  { email: 'prasert@noda.com' },
    update: {},
    create: { name: 'ประเสริฐ คลองแก้ว', email: 'prasert@noda.com', password: hash('user1234') },
  })

  // ─── CommunityMember ─────────────────────────────────────
  // สมใจ = admin ของ comA, user ของ comB
  await prisma.communityMember.upsert({
    where:  { userId_communityId: { userId: userSomjai.id, communityId: comA.id } },
    update: {},
    create: { userId: userSomjai.id, communityId: comA.id, role: 'admin' },
  })
  await prisma.communityMember.upsert({
    where:  { userId_communityId: { userId: userSomjai.id, communityId: comB.id } },
    update: {},
    create: { userId: userSomjai.id, communityId: comB.id, role: 'user' },
  })

  // มารี = user ของ comA เท่านั้น
  await prisma.communityMember.upsert({
    where:  { userId_communityId: { userId: userMarie.id, communityId: comA.id } },
    update: {},
    create: { userId: userMarie.id, communityId: comA.id, role: 'user' },
  })

  // ประเสริฐ = admin ของ comB, user ของ comA
  await prisma.communityMember.upsert({
    where:  { userId_communityId: { userId: userPrasert.id, communityId: comB.id } },
    update: {},
    create: { userId: userPrasert.id, communityId: comB.id, role: 'admin' },
  })
  await prisma.communityMember.upsert({
    where:  { userId_communityId: { userId: userPrasert.id, communityId: comA.id } },
    update: {},
    create: { userId: userPrasert.id, communityId: comA.id, role: 'user' },
  })

  // ─── Posts ───────────────────────────────────────────────
  await prisma.post.createMany({
    skipDuplicates: true,
    data: [
      { title: 'คำศัพท์ไทใหญ่ — ยุคกาลเกษตร', template: 'dictionary', category: 'language', tags: ['ไทดำ', 'เกษตร'],    authorId: userSomjai.id,  communityId: comA.id },
      { title: 'แผนที่วัฒนธรรมบ้านท้วยทราม',   template: 'map',        category: 'cultural_map', tags: ['ชุมชน'],       authorId: userPrasert.id, communityId: comA.id },
      { title: 'เพลงกล่อมเด็กไทใหญ่ — 3 เพลง', template: 'audio',      category: 'language', tags: ['ไทใหญ่', 'เพลง'], authorId: userMarie.id,   communityId: comA.id },
    ],
  })

  // ─── Announcements ───────────────────────────────────────
  await prisma.announcement.createMany({
    skipDuplicates: true,
    data: [
      { title: 'เปิดรับสมาชิกใหม่ 2569', body: 'ชุมชนเปิดรับสมาชิกใหม่', type: 'general', authorId: userSomjai.id, communityId: comA.id },
    ],
  })

  console.log('✅ Seed complete!')
  console.log('📧 admin@noda.com / admin1234  → admin ของ community-a')
  console.log('📧 marie@noda.com / user1234   → user ของ community-a')
  console.log('📧 prasert@noda.com / user1234 → admin ของ community-b')
}

main().catch(console.error).finally(() => prisma.$disconnect())
