const express = require('express')
const router  = express.Router()
const { PrismaClient } = require('@prisma/client')
const auth    = require('../middleware/auth')
const prisma  = new PrismaClient()

router.get('/', auth, async (req, res) => {
  const { q, scope = 'all', page = '1', limit = '20' } = req.query
  const cid  = req.user.communityId
  if (!q) return res.status(400).json({ message: 'กรุณาระบุคำค้นหา' })

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const take = parseInt(limit)
  const results = {}

  try {
    if (['all', 'posts', 'home', 'knowledge'].includes(scope)) {
      const where = {
        communityId: cid,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { tags:  { hasSome: [q] } },
          { author: { name: { contains: q, mode: 'insensitive' } } },
        ],
      }
      const [data, total] = await Promise.all([
        prisma.post.findMany({
          where, skip, take, orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, template: true, category: true, tags: true, createdAt: true, author: { select: { name: true } } },
        }),
        prisma.post.count({ where }),
      ])
      results.posts = { total, data: data.map(p => ({ ...p, authorName: p.author.name, author: undefined })) }
    }

    if (['all', 'announcements'].includes(scope)) {
      const where = {
        communityId: cid,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { body:  { contains: q, mode: 'insensitive' } },
        ],
      }
      const [data, total] = await Promise.all([
        prisma.announcement.findMany({
          where, skip, take, orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, body: true, type: true, eventDate: true, createdAt: true, author: { select: { name: true } } },
        }),
        prisma.announcement.count({ where }),
      ])
      results.announcements = {
        total,
        data: data.map(a => ({
          ...a, authorName: a.author.name, author: undefined,
          eventDate: a.eventDate ? a.eventDate.toISOString().split('T')[0] : null,
        })),
      }
    }

    if (['all', 'members'].includes(scope)) {
      const where = {
        communityId: cid,
        user: { OR: [
          { name:  { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ]},
      }
      const [data, total] = await Promise.all([
        prisma.communityMember.findMany({
          where, skip, take,
          select: { role: true, user: { select: { id: true, name: true, email: true } } },
        }),
        prisma.communityMember.count({ where }),
      ])
      results.members = { total, data: data.map(m => ({ ...m.user, role: m.role })) }
    }

    res.json({ q, scope, communityId: cid, results })
  } catch (err) {
    console.error('[Search]', err)
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

module.exports = router
