const express  = require('express')
const router   = express.Router()
const { PrismaClient } = require('@prisma/client')
const authMiddleware   = require('../middleware/auth')

const prisma = new PrismaClient()

// GET /announcements
router.get('/', authMiddleware, async (req, res) => {
  const cid  = req.user.communityId
  const list = await prisma.announcement.findMany({
    where:   { communityId: cid },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { name: true } } },
  })
  res.json(list.map(a => ({
    id: a.id, title: a.title, body: a.body, type: a.type,
    eventDate:  a.eventDate,
    authorName: a.author.name,
    createdAt:  a.createdAt,
  })))
})

// POST /announcements — Admin เท่านั้น
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'เฉพาะ Admin เท่านั้น' })
  }
  const { title, body, type = 'general', eventDate } = req.body
  if (!title || !body) return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' })

  const ann = await prisma.announcement.create({
    data: {
      title, body, type,
      eventDate:   eventDate ? new Date(eventDate) : null,
      authorId:    req.user.id,
      communityId: req.user.communityId,
    },
    include: { author: { select: { name: true } } },
  })

  res.status(201).json({
    id: ann.id, title: ann.title, body: ann.body, type: ann.type,
    eventDate: ann.eventDate, authorName: ann.author.name, createdAt: ann.createdAt,
  })
})

// DELETE /announcements/:id — Admin เท่านั้น
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'เฉพาะ Admin เท่านั้น' })
  }
  await prisma.announcement.delete({ where: { id: parseInt(req.params.id) } })
  res.json({ message: 'ลบแล้ว' })
})

module.exports = router
