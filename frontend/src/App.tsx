import { useEffect, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useDebounce } from 'use-debounce'

const API = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
type Curriculum = { _id: string; title: string; level?: string; subject?: string; category?: string; audience?: string; version?: string; fileUrl: string; sizeBytes?: number }
type Page = { items: Curriculum[]; total: number; page: number; pages: number }
type Facets = Record<'level' | 'subject' | 'category' | 'audience' | 'version', string[]>
const get = <T,>(p: string) => fetch(`${API}${p}`).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() as Promise<T> })
const mb = (b?: number) => (b ? `${(b / 1048576).toFixed(1)} MB` : '')
const LEVEL_ORDER = ['KG', 'Basic', 'JHS', 'SHS', 'TVET', 'Professional', 'General', 'Unsorted']
const sortLevels = (l: string[]) => [...l].sort((a, b) => LEVEL_ORDER.findIndex(p => a.startsWith(p)) - LEVEL_ORDER.findIndex(p => b.startsWith(p)) || a.localeCompare(b, undefined, { numeric: true }))
const FILTERS = [['level', 'Level'], ['subject', 'Subject'], ['category', 'Category'], ['audience', 'Audience'], ['version', 'Version']] as const
type Key = typeof FILTERS[number][0]
const empty: Record<Key, string> = { level: '', subject: '', category: '', audience: '', version: '' }

function readUrl() { const p = new URLSearchParams(location.search); const f = { ...empty }; for (const [k] of FILTERS) f[k] = p.get(k) ?? ''; return { f, q: p.get('q') ?? '', page: +(p.get('page') ?? 1) || 1 } }

export default function App() {
  const init = readUrl()
  const [f, setF] = useState(init.f), [q, setQ] = useState(init.q), [page, setPage] = useState(init.page)
  const [dq] = useDebounce(q, 350)
  const params = new URLSearchParams(Object.entries({ ...f, q: dq, page: String(page), limit: '24' }).filter(([, v]) => v))
  useEffect(() => { history.replaceState(null, '', `?${params}`) }, [params.toString()])
  const first = useRef(true)
  useEffect(() => { if (first.current) { first.current = false; return } setPage(1) }, [dq, f.level, f.subject, f.category, f.audience, f.version])

  const facets = useQuery({ queryKey: ['facets'], queryFn: () => get<Facets>('/api/facets'), staleTime: 3600e3 })
  const list = useQuery({ queryKey: ['curricula', params.toString()], queryFn: () => get<Page>(`/api/curricula?${params}`), placeholderData: keepPreviousData, retry: 2 })
  const d = list.data, active = Object.values(f).some(Boolean) || q

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-amber-600 text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className="text-xs uppercase tracking-widest text-emerald-100">Ministry of Education · Ghana</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Ghana Curriculum Resources</h1>
          <p className="mt-2 max-w-2xl text-emerald-50">Curricula, learner materials, teacher manuals and guides from KG to SHS — searchable in one place.</p>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search titles, subjects, file names…"
            className="mt-6 w-full max-w-xl rounded-xl bg-white px-4 py-3 text-slate-800 shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-300" />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
          {FILTERS.map(([k, label]) => {
            const opts = facets.data?.[k] ?? []
            return (
              <label key={k} className="flex flex-col gap-1 text-xs font-medium text-slate-500">{label}
                <select value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none">
                  <option value="">All{opts.length ? ` (${opts.length})` : ''}</option>
                  {(k === 'level' ? sortLevels(opts) : opts).map(o => <option key={o}>{o}</option>)}
                </select>
              </label>)
          })}
          <div className="flex items-end">
            <button disabled={!active} onClick={() => { setF(empty); setQ('') }} className="w-full rounded-lg border border-emerald-600 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-40">Clear filters</button>
          </div>
        </div>
        <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
          <span>{d ? `${d.total.toLocaleString()} resources` : ' '}{list.isFetching && d ? ' · updating…' : ''}</span>
          {d && d.pages > 1 && <span>Page {d.page} of {d.pages}</span>}
        </div>
        {list.isLoading && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-200" />)}</div>}
        {list.isError && <p className="rounded-xl bg-red-50 p-4 text-red-700">Could not load resources. The server may be waking up — please refresh in a moment.</p>}
        {d && d.total === 0 && <p className="py-10 text-center text-slate-500">No resources match your search.</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {d?.items.map(c => (
            <a key={c._id} href={c.fileUrl} target="_blank" rel="noreferrer"
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md">
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {c.level && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">{c.level}</span>}
                {c.category && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">{c.category}</span>}
                {c.audience && <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">{c.audience}</span>}
              </div>
              <h2 className="mt-3 line-clamp-3 font-semibold leading-snug group-hover:text-emerald-700">{c.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{c.subject ?? 'General'}{c.version ? ` · ${c.version}` : ''}</p>
              <div className="mt-auto flex items-center justify-between pt-4 text-xs text-slate-400">
                <span>PDF · {mb(c.sizeBytes)}</span><span className="font-medium text-emerald-700">Open →</span>
              </div>
            </a>))}
        </div>
        {d && d.pages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-2">
            <button disabled={page <= 1} onClick={() => { setPage(page - 1); scrollTo(0, 0) }} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">← Previous</button>
            <span className="px-3 text-sm text-slate-500">{page} / {d.pages}</span>
            <button disabled={page >= d.pages} onClick={() => { setPage(page + 1); scrollTo(0, 0) }} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">Next →</button>
          </nav>)}
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">Source: curriculumresources.edu.gh · Files hosted on Google Drive</footer>
    </div>)
}
