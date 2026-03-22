# Noda Backend

Node.js + Express + Prisma + PostgreSQL

## เริ่มต้น

```bash
npm install
# แก้ .env ใส่ DATABASE_URL และ JWT_SECRET
npx prisma db push
node prisma/seed.js
npm run dev
```

## Login ทดสอบ
- Email: `admin@comA.com` / Password: `admin1234`

## Routes
| Method | Path | Description |
|---|---|---|
| POST | /auth/login | Login รับ JWT |
| GET | /auth/me | ข้อมูล user ปัจจุบัน |
| GET | /posts | ดึงโพสต์ของชุมชน |
| POST | /posts | สร้างโพสต์ใหม่ |
| GET | /community/:id/stats | สถิติชุมชน |
| GET | /members | รายชื่อสมาชิก |
| GET | /announcements | ประกาศข่าว |
| GET | /search | ค้นหาทุกประเภท |

## Deploy บน Railway
1. Push ขึ้น GitHub
2. เชื่อม Railway กับ repo นี้
3. ตั้ง Environment Variables ใน Railway Dashboard
4. Railway จะ deploy อัตโนมัติ
