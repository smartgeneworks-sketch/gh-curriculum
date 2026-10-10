import mongoose from 'mongoose'
await mongoose.connect(process.env.MONGODB_URI)
const C = mongoose.model('Curriculum', new mongoose.Schema({ title: String, level: String, subject: String, category: String, sourceUrl: String, fileUrl: String, driveFileId: String, sizeBytes: Number }, { timestamps: true }))
const id = '1EhX4WVYZdnfefA-NgPLRE0YDOouoBCBO'
await C.updateOne({ driveFileId: id }, { $set: { title: 'Year 1 Biology Learner Material – Section 1', level: 'SHS Year 1', subject: 'Biology', category: 'Learner Material', sourceUrl: 'https://curriculumresources.edu.gh/wp-content/uploads/2024/11/LM-Biology-section-1-LVersion.pdf', fileUrl: `https://drive.google.com/file/d/${id}/view`, driveFileId: id, sizeBytes: 8808105 } }, { upsert: true })
console.log('connected; count =', await C.countDocuments())
await mongoose.disconnect()
