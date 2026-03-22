const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const crypto  = require('crypto')
const { PrismaClient } = require('@prisma/client')
const authMiddleware   = require('../middleware/auth')

const prisma = new PrismaClient()

// ─── One-time handoff tokens (in-memory) ─────────────────────
const handoffTokens = new Map() // token → { userId, email, expiresAt }

// ─── POST /auth/login ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password, communityId } = req.body
  if (!email || !password || !communityId) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' })
  }

  try {
    const community = await prisma.community.findUnique({ where: { id: communityId } })
    if (!community) return res.status(404).json({ message: 'ไม่พบชุมชน' })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })
    }

    let membership = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId: user.id, communityId } },
    })
    if (!membership) {
      membership = await prisma.communityMember.create({
        data: { userId: user.id, communityId, role: 'user' },
      })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: membership.role, communityId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: membership.role, communityId },
    })
  } catch (err) {
    console.error('[Login]', err)
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

// ─── POST /auth/register ──────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password, communityId } = req.body
  if (!name || !email || !password || !communityId) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' })
  }

  try {
    const community = await prisma.community.findUnique({ where: { id: communityId } })
    if (!community) return res.status(404).json({ message: 'ไม่พบชุมชน' })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ message: 'อีเมลนี้มีบัญชีอยู่แล้ว' })

    const hashed = await bcrypt.hash(password, 10)

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, password: hashed },
      })
      const membership = await tx.communityMember.create({
        data: { userId: user.id, communityId, role: 'user' },
      })
      return { user, membership }
    })

    const token = jwt.sign(
      { id: result.user.id, email: result.user.email, role: 'user', communityId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.status(201).json({
      token,
      user: { id: result.user.id, name: result.user.name, email: result.user.email, role: 'user', communityId },
    })
  } catch (err) {
    console.error('[Register]', err)
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

// ─── GET /auth/me ─────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { id: true, name: true, email: true },
    })
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' })
    res.json({ ...user, role: req.user.role, communityId: req.user.communityId })
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

// ─── POST /auth/logout ────────────────────────────────────────
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ message: 'ออกจากระบบแล้ว' })
})

// ─── POST /auth/handoff-token ─────────────────────────────────
// comA เรียกเพื่อสร้าง one-time token ส่งไปให้ comB
router.post('/handoff-token', authMiddleware, (req, res) => {
  const token     = crypto.randomBytes(24).toString('hex')
  const expiresAt = Date.now() + 30_000 // 30 วินาที

  handoffTokens.set(token, { userId: req.user.id, email: req.user.email, expiresAt })
  setTimeout(() => handoffTokens.delete(token), 30_000)

  res.json({ token })
})

// ─── POST /auth/verify-handoff ────────────────────────────────
// comB เรียกเพื่อแลก one-time token → JWT ของ comB
router.post('/verify-handoff', async (req, res) => {
  const { token, communityId } = req.body
  if (!token || !communityId) {
    return res.status(400).json({ message: 'กรุณาส่ง token และ communityId' })
  }

  const entry = handoffTokens.get(token)
  handoffTokens.delete(token) // ใช้ได้ครั้งเดียว

  if (!entry || Date.now() > entry.expiresAt) {
    return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุแล้ว' })
  }

  try {
    const community = await prisma.community.findUnique({ where: { id: communityId } })
    if (!community) return res.status(404).json({ message: 'ไม่พบชุมชน' })

    let membership = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId: entry.userId, communityId } },
    })
    if (!membership) {
      membership = await prisma.communityMember.create({
        data: { userId: entry.userId, communityId, role: 'user' },
      })
    }

    const user = await prisma.user.findUnique({
      where:  { id: entry.userId },
      select: { id: true, name: true, email: true },
    })

    const newToken = jwt.sign(
      { id: user.id, email: user.email, role: membership.role, communityId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.json({
      token: newToken,
      user:  { ...user, role: membership.role, communityId },
    })
  } catch (err) {
    console.error('[verify-handoff]', err)
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
})

module.exports = router
