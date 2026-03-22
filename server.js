require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const app     = express()

// ─── CORS ─────────────────────────────────────────────────────
// FRONTEND_URL รองรับหลาย domain คั่นด้วย comma
// เช่น https://com-a.web.app,https://com-b.web.app,https://com-c.web.app
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(u => u.trim())
  .filter(Boolean)
  .concat([
    'http://localhost:5173',
    'http://localhost:4173',
  ])

app.use(cors({
  origin: (origin, callback) => {
    // อนุญาต request ที่ไม่มี origin (Thunder Client, mobile, server-to-server)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: ${origin} not allowed`))
  },
  credentials: true,
}))

app.use(express.json())

// ─── Routes ──────────────────────────────────────────────────
app.use('/auth',          require('./routes/auth'))
app.use('/community',     require('./routes/community'))
app.use('/posts',         require('./routes/posts'))
app.use('/members',       require('./routes/members'))
app.use('/announcements', require('./routes/announcements'))
app.use('/search',        require('./routes/search'))

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }))

// ─── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🚀 Noda Backend on http://localhost:${PORT}`))
