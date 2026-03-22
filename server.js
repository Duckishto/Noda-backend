require('dotenv').config()
const express = require('express')
const cors    = require('cors')

const app = express()

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// ─── Routes ──────────────────────────────────────────────────
app.use('/auth',          require('./routes/auth'))
app.use('/posts',         require('./routes/posts'))
app.use('/community',     require('./routes/community'))
app.use('/members',       require('./routes/members'))
app.use('/announcements', require('./routes/announcements'))
app.use('/search',        require('./routes/search'))

// ─── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// ─── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Noda Backend running on http://localhost:${PORT}`)
})
