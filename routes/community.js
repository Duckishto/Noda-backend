const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcryptjs')
const crypto  = require('crypto')
const { PrismaClient } = require('@prisma/client')
const authMiddleware   = require('../middleware/auth')

const prisma = new PrismaClient()

// GET /community/all — รายชื่อทุกชุมชน (ใช้บน noda.com)
router.get('/all', async (req, res) => {
  try {
    const list = await prisma.community.findMany({
      select: {
        id: true, name: true, domain: true, description: true,
        _count: { select: { posts: true, members: true } },
      },
      orderBy: { name: 'asc' },
    })
    res.json(list.map(c => ({
      id: c.id, name: c.name, domain: c.domain, description: c.description,
      postCount:   c._count.posts,
      memberCount: c._count.members,
      url: `https://${c.domain}`,
    })))
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

// GET /community/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const c = await prisma.community.findUnique({
      where:  { id: req.params.id },
      select: { id: true, name: true, domain: true, description: true },
    })
    if (!c) return res.status(404).json({ message: 'ไม่พบชุมชน' })
    res.json(c)
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

// GET /community/:id/stats
router.get('/:id/stats', authMiddleware, async (req, res) => {
  const cid = req.params.id
  try {
    const [postCount, memberCount, connectedCount, posts] = await Promise.all([
      prisma.post.count({ where: { communityId: cid } }),
      prisma.communityMember.count({ where: { communityId: cid } }),
      prisma.community.count(),
      prisma.post.findMany({ where: { communityId: cid }, select: { tags: true } }),
    ])
    const uniqueTags = new Set(posts.flatMap(p => p.tags))
    res.json({
      postCount, memberCount,
      wordCount:            uniqueTags.size * 78,
      connectedCommunities: connectedCount,
    })
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

// POST /community/register — ชุมชนใหม่สมัครเองได้
// ผู้นำชุมชนสมัครผ่าน Google Form หรือหน้าเว็บ noda.com
router.post('/register', async (req, res) => {
  const { name, domain, adminEmail, adminName, adminPassword } = req.body
  if (!name || !domain || !adminEmail || !adminName) {
    return res.status(400).json({ message: 'กรุณากรอก name, domain, adminEmail, adminName' })
  }

  try {
    const existingDomain = await prisma.community.findUnique({ where: { domain } })
    if (existingDomain) return res.status(409).json({ message: `โดเมน ${domain} ถูกใช้แล้ว` })

    // communityId สร้างจาก domain
    const communityId = domain
      .toLowerCase()
      .replace(/\.(com|net|org|app|web|th)$/, '')
      .replace(/[^a-z0-9]/g, '-')

    // password: ถ้าส่งมา ใช้ของเขา ถ้าไม่มี สุ่มให้
    const rawPassword = adminPassword || crypto.randomBytes(6).toString('hex')
    const hashedPw    = await bcrypt.hash(rawPassword, 10)

    await prisma.$transaction(async (tx) => {
      // สร้าง community
      await tx.community.create({
        data: { id: communityId, name, domain },
      })

      // ถ้า admin มีบัญชีอยู่แล้ว ให้ใช้บัญชีเดิม
      let user = await tx.user.findUnique({ where: { email: adminEmail } })
      if (!user) {
        user = await tx.user.create({
          data: { name: adminName, email: adminEmail, password: hashedPw },
        })
      }

      // เพิ่มเป็น admin ของ community ใหม่
      await tx.communityMember.create({
        data: { userId: user.id, communityId, role: 'admin' },
      })
    })

    console.log(`✅ New community: ${communityId} | admin: ${adminEmail} / ${rawPassword}`)

    res.status(201).json({
      message:     'ลงทะเบียนชุมชนสำเร็จ',
      communityId,
      adminEmail,
      adminPassword: rawPassword,   // TODO: ส่งทาง email แทน
      envConfig: {
        VITE_API_URL:      'https://noda-backend-production.up.railway.app',
        VITE_COMMUNITY_ID: communityId,
        VITE_SKIP_AUTH:    'false',
      },
    })
  } catch (err) {
    console.error('[Register Community]', err)
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

module.exports = router
