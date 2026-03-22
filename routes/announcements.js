const express = require('express')
const router  = express.Router()
const { PrismaClient } = require('@prisma/client')
const auth    = require('../middleware/auth')
const { adminOnly } = require('../middleware/auth')
const prisma  = new PrismaClient()

const annInclude = { author: { select: { name: true } } }
const fmt = (a) => ({
  id: a.id, title: a.title, body: a.body, type: a.type,
  eventDate:  a.eventDate ? a.eventDate.toISOString().split('T')[0] : null,
  authorName: a.author.name,
  createdAt:  a.createdAt,
})

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

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await prisma.announcement.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ message: 'ลบแล้ว' })
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

module.exports = router
