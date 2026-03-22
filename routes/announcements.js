const express = require('express')
const router  = express.Router()
const { PrismaClient } = require('@prisma/client')
const auth    = require('../middleware/auth')

const prisma = new PrismaClient()

// adminOnly middleware — ตรวจสิทธิ์ก่อน handler
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'เฉพาะ Admin ของชุมชนนี้เท่านั้น' })
  }
  next()
}

const annInclude = { author: { select: { name: true } } }

function fmt(a) {
  return {
    id:         a.id,
    title:      a.title,
    body:       a.body,
    type:       a.type,
    eventDate:  a.eventDate ? a.eventDate.toISOString().split('T')[0] : null,
    authorName: a.author.name,
    createdAt:  a.createdAt,
  }
}

// GET /announcements
router.get('/', auth, async (req, res) => {
  try {
    const list = await prisma.announcement.findMany({
      where:   { communityId: req.user.communityId },
      orderBy: { createdAt: 'desc' },
      include: annInclude,
    })
    res.json(list.map(fmt))
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

// POST /announcements — Admin เท่านั้น
router.post('/', auth, adminOnly, async (req, res) => {
  const { title, body, type = 'general', eventDate } = req.body
  if (!title || !body) return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' })
  try {
    const ann = await prisma.announcement.create({
      data: {
        title, body, type,
        eventDate:   eventDate ? new Date(eventDate) : null,
        authorId:    req.user.id,
        communityId: req.user.communityId,
      },
      include: annInclude,
    })
    res.status(201).json(fmt(ann))
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

// DELETE /announcements/:id — Admin เท่านั้น
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await prisma.announcement.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ message: 'ลบแล้ว' })
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

module.exports = router
