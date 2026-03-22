const express  = require('express')
const router   = express.Router()
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const authMiddleware   = require('../middleware/auth')

<<<<<<< HEAD
// ─── authMiddleware ───────────────────────────────────────────
// ตรวจ JWT ทุก request
// JWT payload: { id, email, role, communityId }
// role = role ของ user ใน community นั้น (admin หรือ user)

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'ไม่มี token กรุณา login ก่อน' })
  }

  const token = header.split(' ')[1]
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token หมดอายุ กรุณา login ใหม่' })
=======
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
>>>>>>> 96a58fad236d97b4a717c7ecee9967182bee55c2
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
<<<<<<< HEAD
}

// ─── adminOnly ───────────────────────────────────────────────
// ใช้ต่อจาก authMiddleware สำหรับ route ที่ต้องการ admin
module.exports.adminOnly = function (req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'เฉพาะ Admin ของชุมชนนี้เท่านั้น' })
  }
  next()
}
=======
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
>>>>>>> 96a58fad236d97b4a717c7ecee9967182bee55c2
