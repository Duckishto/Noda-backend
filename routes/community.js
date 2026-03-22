const express  = require('express')
const router   = express.Router()
const { PrismaClient } = require('@prisma/client')
const authMiddleware   = require('../middleware/auth')

const prisma = new PrismaClient()

// GET /community — รายการชุมชนทั้งหมด (ใช้บน noda.com)
router.get('/', async (req, res) => {
  const list = await prisma.community.findMany({
    select: { id: true, name: true, domain: true, description: true },
  })
  res.json(list)
})

// GET /community/:id
router.get('/:id', authMiddleware, async (req, res) => {
  const community = await prisma.community.findUnique({
    where:  { id: req.params.id },
    select: { id: true, name: true, domain: true, description: true },
  })
  if (!community) return res.status(404).json({ message: 'ไม่พบชุมชน' })
  res.json(community)
})

// GET /community/:id/stats
router.get('/:id/stats', authMiddleware, async (req, res) => {
  const cid = req.params.id

  const [postCount, memberCount, connectedCount] = await Promise.all([
    prisma.post.count({ where: { communityId: cid } }),
    prisma.user.count({ where: { communityId: cid } }),
    prisma.community.count(),
  ])

  // wordCount — นับจาก tags ทั้งหมดของ community นี้ (approximate)
  const posts     = await prisma.post.findMany({ where: { communityId: cid }, select: { tags: true } })
  const wordCount = [...new Set(posts.flatMap(p => p.tags))].length * 78  // rough estimate

  res.json({ postCount, memberCount, wordCount, connectedCommunities: connectedCount })
})

module.exports = router
