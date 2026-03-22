const express = require('express')
const router  = express.Router()
const { PrismaClient } = require('@prisma/client')
const auth    = require('../middleware/auth')
const prisma  = new PrismaClient()

// GET /members?q=ค้นหา
router.get('/', auth, async (req, res) => {
  const { q } = req.query
  const cid   = req.user.communityId

  try {
    const members = await prisma.communityMember.findMany({
      where: {
        communityId: cid,
        ...(q && {
          user: {
            OR: [
              { name:  { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        }),
      },
      select: {
        role: true,
        joinedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { user: { name: 'asc' } },
    })

    res.json(members.map(m => ({
      id:       m.user.id,
      name:     m.user.name,
      email:    m.user.email,
      role:     m.role,
      joinedAt: m.joinedAt,
    })))
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

module.exports = router
