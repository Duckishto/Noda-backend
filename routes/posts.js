const express  = require('express')
const router   = express.Router()
const { PrismaClient } = require('@prisma/client')
const authMiddleware   = require('../middleware/auth')

const prisma = new PrismaClient()

// ─── GET /posts ──────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  const { communityId, category, tag, page = '1', limit = '20' } = req.query

  // Data Isolation: บังคับใช้ communityId จาก token เสมอ
  const cid  = req.user.communityId
  const skip = (parseInt(page) - 1) * parseInt(limit)
  const take = parseInt(limit)

  const where = {
    communityId: cid,
    ...(category && { category }),
    ...(tag      && { tags: { has: tag } }),
  }

  try {
    const [data, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip, take,
        include: { author: { select: { id: true, name: true } } },
      }),
      prisma.post.count({ where }),
    ])

    res.json({
      data: data.map(p => ({
        id:          p.id,
        title:       p.title,
        template:    p.template,
        category:    p.category,
        tags:        p.tags,
        authorId:    p.authorId,
        authorName:  p.author.name,
        communityId: p.communityId,
        createdAt:   p.createdAt,
        viewCount:   p.viewCount,
      })),
      total,
      page:  parseInt(page),
      limit: take,
    })
  } catch (err) {
    console.error('[GET /posts]', err)
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

// ─── GET /posts/:id ───────────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await prisma.post.findFirst({
      where:   { id: parseInt(req.params.id), communityId: req.user.communityId },
      include: { author: { select: { id: true, name: true } } },
    })
    if (!post) return res.status(404).json({ message: 'ไม่พบชิ้นงาน' })

    // เพิ่ม viewCount
    await prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })

    res.json({
      id: post.id, title: post.title, template: post.template,
      category: post.category, tags: post.tags,
      authorId: post.authorId, authorName: post.author.name,
      communityId: post.communityId, createdAt: post.createdAt,
      viewCount: post.viewCount + 1,
    })
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

// ─── POST /posts ──────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { title, template, category, tags = [] } = req.body

  if (!title || !template || !category) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' })
  }

  try {
    const post = await prisma.post.create({
      data: {
        title, template, category, tags,
        authorId:    req.user.id,
        communityId: req.user.communityId,
      },
      include: { author: { select: { id: true, name: true } } },
    })

    res.status(201).json({
      id: post.id, title: post.title, template: post.template,
      category: post.category, tags: post.tags,
      authorId: post.authorId, authorName: post.author.name,
      communityId: post.communityId, createdAt: post.createdAt, viewCount: 0,
    })
  } catch (err) {
    console.error('[POST /posts]', err)
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

// ─── PUT /posts/:id ───────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  const { title, template, category, tags } = req.body
  const id = parseInt(req.params.id)

  try {
    const post = await prisma.post.findFirst({
      where: { id, communityId: req.user.communityId },
    })
    if (!post) return res.status(404).json({ message: 'ไม่พบชิ้นงาน' })

    // เฉพาะเจ้าของหรือ Admin เท่านั้น
    if (post.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไข' })
    }

    const updated = await prisma.post.update({
      where: { id },
      data:  { title, template, category, tags },
    })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

// ─── DELETE /posts/:id ────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    const post = await prisma.post.findFirst({
      where: { id, communityId: req.user.communityId },
    })
    if (!post) return res.status(404).json({ message: 'ไม่พบชิ้นงาน' })

    if (post.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบ' })
    }

    await prisma.post.delete({ where: { id } })
    res.json({ message: 'ลบแล้ว' })
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

module.exports = router
