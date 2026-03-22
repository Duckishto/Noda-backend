const jwt = require('jsonwebtoken')

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
    }
    return res.status(401).json({ message: 'Token ไม่ถูกต้อง' })
  }
}

// ─── adminOnly ───────────────────────────────────────────────
// ใช้ต่อจาก authMiddleware สำหรับ route ที่ต้องการ admin
module.exports.adminOnly = function (req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'เฉพาะ Admin ของชุมชนนี้เท่านั้น' })
  }
  next()
}
