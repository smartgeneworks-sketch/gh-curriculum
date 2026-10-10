import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
const app = express()
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' }))
app.use(express.json())
const Curriculum = mongoose.model('Curriculum', new mongoose.Schema({
  title: String, level: String, subject: String, category: String,
  sourceUrl: String, fileUrl: String, driveFileId: String, sizeBytes: Number,
}, { timestamps: true }))
const states = ['disconnected', 'connected', 'connecting', 'disconnecting']
app.get('/api/health', (_q, r) => r.json({ ok: true, db: states[mongoose.connection.readyState] }))
app.get('/api/curricula', async (q, r) => {
  if (mongoose.connection.readyState !== 1) return r.status(503).json({ error: 'db not connected' })
  const f = {}; for (const k of ['level', 'subject', 'category']) if (q.query[k]) f[k] = q.query[k]
  r.json(await Curriculum.find(f).sort({ level: 1, subject: 1, title: 1 }).lean())
})
const port = process.env.PORT || 8080
app.listen(port, () => console.log('listening', port))
const sample = { title: 'Year 1 Biology Learner Material – Section 1', level: 'SHS Year 1', subject: 'Biology', category: 'Learner Material',
  sourceUrl: 'https://curriculumresources.edu.gh/wp-content/uploads/2024/11/LM-Biology-section-1-LVersion.pdf',
  fileUrl: 'https://drive.google.com/file/d/1EhX4WVYZdnfefA-NgPLRE0YDOouoBCBO/view', driveFileId: '1EhX4WVYZdnfefA-NgPLRE0YDOouoBCBO', sizeBytes: 8808105 }
app.get('/api/facets', async (_q, r) => {
  if (mongoose.connection.readyState !== 1) return r.status(503).json({ error: 'db not connected' })
  const [level, subject, category] = await Promise.all(['level', 'subject', 'category'].map(k => Curriculum.distinct(k)))
  r.json({ level: level.sort(), subject: subject.sort(), category: category.sort() })
})
if (process.env.MONGODB_URI) mongoose.connect(process.env.MONGODB_URI)
  .then(async () => { console.log('mongo connected'); if (process.env.SEED_SAMPLE === '1') await Curriculum.updateOne({ driveFileId: sample.driveFileId }, { $set: sample }, { upsert: true }) })
  .catch(e => console.error(e.message))
else console.warn('MONGODB_URI not set')
