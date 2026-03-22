const express  = require('express')
const router   = express.Router()
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const authMiddleware   = require('../middleware/auth')

const prisma = new PrismaClient()

// ─── POST /auth/login ────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password, communityId } = req.body

  if (!email || !password || !communityId) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' })
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email, communityId },
    })

    if (!user) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, communityId: user.communityId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, communityId: user.communityId },
    })
  } catch (err) {
    console.error('[Login Error]', err)
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

// ─── GET /auth/me ─────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, communityId: true },
    })
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

// ─── POST /auth/logout ────────────────────────────────────────
router.post('/logout', authMiddleware, (req, res) => {
  // JWT stateless — client ลบ token เอง
  res.json({ message: 'ออกจากระบบแล้ว' })
})

module.exports = router
