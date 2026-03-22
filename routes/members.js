const express  = require('express')
const router   = express.Router()
const { PrismaClient } = require('@prisma/client')
const authMiddleware   = require('../middleware/auth')

const prisma = new PrismaClient()

// GET /members?communityId=xxx&q=ค้นหา
router.get('/', authMiddleware, async (req, res) => {
  const { q } = req.query
  const cid   = req.user.communityId

  const where = {
    communityId: cid,
    ...(q && {
      OR: [
        { name:  { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    }),
  }

  const members = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  })

  res.json(members)
})

module.exports = router
