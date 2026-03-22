const express = require('express')
const router  = express.Router()
const { PrismaClient } = require('@prisma/client')
const auth    = require('../middleware/auth')
const prisma  = new PrismaClient()

const postSelect = {
  id: true, title: true, template: true, category: true,
  tags: true, authorId: true, communityId: true,
  createdAt: true, viewCount: true,
  author: { select: { name: true } },
}

const fmt = (p) => ({
  id: p.id, title: p.title, template: p.template,
  category: p.category, tags: p.tags,
  authorId: p.authorId, authorName: p.author.name,
  communityId: p.communityId, createdAt: p.createdAt, viewCount: p.viewCount,
})

// GET /posts
router.get('/', auth, async (req, res) => {
  const { category, tag, page = '1', limit = '20' } = req.query
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
      prisma.post.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, select: postSelect }),
      prisma.post.count({ where }),
    ])
    res.json({ data: data.map(fmt), total, page: parseInt(page), limit: take })
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

// GET /posts/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await prisma.post.findFirst({
      where: { id: parseInt(req.params.id), communityId: req.user.communityId },
      select: postSelect,
    })
    if (!post) return res.status(404).json({ message: 'ไม่พบชิ้นงาน' })
    await prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
    res.json({ ...fmt(post), viewCount: post.viewCount + 1 })
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

// POST /posts
router.post('/', auth, async (req, res) => {
  const { title, template, category, tags = [] } = req.body
  if (!title || !template || !category) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' })
  }
  try {
    const post = await prisma.post.create({
      data: { title, template, category, tags, authorId: req.user.id, communityId: req.user.communityId },
      select: postSelect,
    })
    res.status(201).json(fmt(post))
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

// DELETE /posts/:id
router.delete('/:id', auth, async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    const post = await prisma.post.findFirst({ where: { id, communityId: req.user.communityId } })
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
