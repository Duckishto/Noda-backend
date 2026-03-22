require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const app     = express()

// ─── CORS ─────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
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
