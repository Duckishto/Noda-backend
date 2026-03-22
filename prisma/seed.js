const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Communities ─────────────────────────────────
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

  // ─── Users ───────────────────────────────────────
  const hash = (pw) => bcrypt.hashSync(pw, 10)

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@comA.com' },
    update: {},
    create: { name: 'สมใจ ยอดเขา', email: 'admin@comA.com', password: hash('admin1234'), role: 'admin', communityId: comA.id },
  })
  await prisma.user.upsert({
    where:  { email: 'marie@comA.com' },
    update: {},
    create: { name: 'มารี วงศ์คำ', email: 'marie@comA.com', password: hash('user1234'), role: 'user', communityId: comA.id },
  })
  const prasert = await prisma.user.upsert({
    where:  { email: 'prasert@comA.com' },
    update: {},
    create: { name: 'ประเสริฐ คลองแก้ว', email: 'prasert@comA.com', password: hash('user1234'), role: 'user', communityId: comA.id },
  })
  const aree = await prisma.user.upsert({
    where:  { email: 'aree@comA.com' },
    update: {},
    create: { name: 'อารี นาแวง', email: 'aree@comA.com', password: hash('user1234'), role: 'user', communityId: comA.id },
  })

  // ─── Posts ───────────────────────────────────────
  await prisma.post.createMany({
    skipDuplicates: true,
    data: [
      { title: 'คำศัพท์ไทใหญ่ — ยุคกาลเกษตร', template: 'dictionary', category: 'language', tags: ['ไทดำ', 'เกษตร'], authorId: admin.id, communityId: comA.id },
      { title: 'แผนที่วัฒนธรรมบ้านท้วยทราม',  template: 'map',        category: 'cultural_map', tags: ['ชุมชน'], authorId: prasert.id, communityId: comA.id },
      { title: 'เพลงกล่อมเด็กไทใหญ่ — 3 เพลง', template: 'audio',      category: 'language', tags: ['ไทใหญ่', 'เพลง'], authorId: aree.id, communityId: comA.id },
      { title: 'คำรักษาพร้อมด้วยสมุนไพร',       template: 'story',      category: 'wisdom',   tags: ['อาหาร', 'สมุนไพร'], authorId: admin.id, communityId: comA.id },
    ],
  })

  // ─── Announcements ───────────────────────────────
  await prisma.announcement.createMany({
    skipDuplicates: true,
    data: [
      { title: 'เปิดรับสมาชิกใหม่ประจำปี 2569', body: 'ชุมชนเปิดรับสมาชิกใหม่ที่สนใจ', type: 'general', authorId: admin.id, communityId: comA.id },
      { title: 'กิจกรรมเก็บคำศัพท์ภาษาไทดำ', body: 'นัดรวมกลุ่มวันเสาร์ที่ 28 มีนาคม', type: 'event', eventDate: new Date('2026-03-28'), authorId: admin.id, communityId: comA.id },
    ],
  })

  console.log('✅ Seed complete!')
  console.log('📧 Login: admin@comA.com / admin1234')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
