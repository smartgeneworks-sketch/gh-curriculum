import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
const app = express()
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' }))
app.use(express.json({ limit: '5mb' }))
const schema = new mongoose.Schema({
  title: String, filename: String, section: String, level: String, subject: String, category: String,
  audience: String, version: String, sourceUrl: { type: String, unique: true }, sourcePages: [String],
  fileUrl: String, driveFileId: String, sizeBytes: Number,
}, { timestamps: true })
schema.index({ level: 1, subject: 1, title: 1 })
const Curriculum = mongoose.model('Curriculum', schema)
const states = ['disconnected', 'connected', 'connecting', 'disconnecting']
const dbReady = (r) => mongoose.connection.readyState === 1 || (r.status(503).json({ error: 'db not connected' }), false)
const FIELDS = ['level', 'subject', 'category', 'audience', 'version', 'section']
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

app.get('/api/health', (_q, r) => r.json({ ok: true, db: states[mongoose.connection.readyState] }))
app.get('/api/curricula', async (q, r) => {
  if (!dbReady(r)) return
  const f = {}; for (const k of FIELDS) if (q.query[k]) f[k] = q.query[k]
  if (q.query.q) { const re = new RegExp(esc(String(q.query.q).slice(0, 100)), 'i'); f.$or = [{ title: re }, { subject: re }, { filename: re }] }
  const limit = Math.min(100, Math.max(1, +q.query.limit || 24)), page = Math.max(1, +q.query.page || 1)
  const [items, total] = await Promise.all([
    Curriculum.find(f).sort({ level: 1, subject: 1, title: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Curriculum.countDocuments(f)])
  r.json({ items, total, page, pages: Math.ceil(total / limit) })
})
app.get('/api/facets', async (_q, r) => {
  if (!dbReady(r)) return
  const out = {}; await Promise.all(FIELDS.map(async k => { out[k] = (await Curriculum.distinct(k)).filter(Boolean).sort() }))
  r.json(out)
})
app.get('/api/stats', async (_q, r) => {
  if (!dbReady(r)) return
  r.json({ total: await Curriculum.estimatedDocumentCount() })
})
app.post('/api/admin/bulk', async (q, r) => {
  const tok = process.env.ADMIN_TOKEN
  if (!tok || q.get('authorization') !== `Bearer ${tok}`) return r.status(401).json({ error: 'unauthorized' })
  if (!dbReady(r)) return
  const docs = Array.isArray(q.body) ? q.body : q.body?.items
  if (!Array.isArray(docs) || docs.length > 1000) return r.status(400).json({ error: 'expected array (<=1000)' })
  const ops = docs.filter(d => d?.sourceUrl).map(d => ({ updateOne: { filter: { sourceUrl: d.sourceUrl }, update: { $set: d }, upsert: true } }))
  const res = await Curriculum.bulkWrite(ops, { ordered: false })
  r.json({ received: docs.length, upserted: res.upsertedCount, modified: res.modifiedCount, matched: res.matchedCount })
})
const port = process.env.PORT || 8080
app.listen(port, () => console.log('listening', port))
if (process.env.MONGODB_URI) mongoose.connect(process.env.MONGODB_URI).then(() => { console.log('mongo connected'); Curriculum.syncIndexes().catch(e => console.error('index', e.message)) }).catch(e => console.error(e.message))
else console.warn('MONGODB_URI not set')
