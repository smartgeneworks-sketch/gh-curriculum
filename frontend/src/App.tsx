import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

const API = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
type Curriculum = { _id: string; title: string; level: string; subject: string; category: string; fileUrl: string; sourceUrl?: string; sizeBytes?: number }
const get = <T,>(p: string) => fetch(`${API}${p}`).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() as Promise<T> })
const mb = (b?: number) => (b ? `${(b / 1048576).toFixed(1)} MB` : '')

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">{label}
      <select value={value} onChange={e => onChange(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none">
        <option value="">All</option>{options.map(o => <option key={o}>{o}</option>)}
      </select>
    </label>)
}

export default function App() {
  const [f, setF] = useState({ level: '', subject: '', category: '' })
  const [q, setQ] = useState('')
  const health = useQuery({ queryKey: ['health'], queryFn: () => get<{ db: string }>('/api/health'), retry: 1 })
  const { data = [], isLoading, error } = useQuery({ queryKey: ['curricula'], queryFn: () => get<Curriculum[]>('/api/curricula'), retry: 2 })
  const opts = (k: 'level' | 'subject' | 'category') => [...new Set(data.map(d => d[k]).filter(Boolean))].sort()
  const items = useMemo(() => data.filter(d =>
    (!f.level || d.level === f.level) && (!f.subject || d.subject === f.subject) && (!f.category || d.category === f.category) &&
    (!q || `${d.title} ${d.subject}`.toLowerCase().includes(q.toLowerCase()))), [data, f, q])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-amber-600 text-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-xs uppercase tracking-widest text-emerald-100">Ministry of Education · Ghana</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Ghana Curriculum Resources</h1>
          <p className="mt-2 max-w-2xl text-emerald-50">Browse curricula, learner materials and teacher resources by level, subject and category.</p>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by title or subject…"
            className="mt-6 w-full max-w-xl rounded-xl px-4 py-3 text-slate-800 shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-4">
          <Select label="Level" value={f.level} options={opts('level')} onChange={v => setF({ ...f, level: v })} />
          <Select label="Subject" value={f.subject} options={opts('subject')} onChange={v => setF({ ...f, subject: v })} />
          <Select label="Category" value={f.category} options={opts('category')} onChange={v => setF({ ...f, category: v })} />
          <div className="flex items-end justify-between gap-2 text-sm text-slate-500">
            <span>{items.length} of {data.length} resources</span>
            <button onClick={() => { setF({ level: '', subject: '', category: '' }); setQ('') }} className="rounded-lg px-3 py-2 text-emerald-700 hover:bg-emerald-50">Reset</button>
          </div>
        </div>
        {isLoading && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(i => <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200" />)}</div>}
        {error && <p className="rounded-xl bg-red-50 p-4 text-red-700">Could not load resources. The server may be waking up — please refresh in a moment.</p>}
        {!isLoading && !error && items.length === 0 && <p className="text-slate-500">No resources match your filters.</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(c => (
            <a key={c._id} href={c.fileUrl} target="_blank" rel="noreferrer"
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">{c.level}</span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">{c.category}</span>
              </div>
              <h2 className="mt-3 font-semibold leading-snug group-hover:text-emerald-700">{c.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{c.subject}</p>
              <div className="mt-auto flex items-center justify-between pt-4 text-xs text-slate-400">
                <span>PDF · {mb(c.sizeBytes)}</span><span className="font-medium text-emerald-700">Open in Drive →</span>
              </div>
            </a>))}
        </div>
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Source: curriculumresources.edu.gh · API {health.isSuccess ? `online (db ${health.data.db})` : health.isError ? 'offline' : 'checking…'}
      </footer>
    </div>)
}
