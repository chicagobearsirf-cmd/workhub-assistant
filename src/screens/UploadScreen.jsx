import { useState, useRef, useCallback } from 'react'
import Toast from '../components/Toast'
import { getSession } from '../lib/session'

// ─── Constants ────────────────────────────────────────────────────────────

const DOC_ACCEPT = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt',
  '.ppt', '.pptx', '.pages', '.numbers', '.key',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
].join(',')

const VISION_SYSTEM = `You are a data extraction assistant. Extract contact information from images and return ONLY valid JSON. Do not include any explanation, markdown, or text outside the JSON object.`

const VISION_PROMPT = (ctx) => `Extract all contact details visible in this image.
${ctx ? `Additional context: ${ctx}` : ''}
Return ONLY this JSON (use "" for unknown fields):
{
  "firstName": "",
  "lastName": "",
  "phone": "",
  "email": "",
  "address": "",
  "jobType": "",
  "notes": ""
}`

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatBytes(b) {
  if (b < 1024)        return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB'
  return (b / (1024 * 1024)).toFixed(1) + ' MB'
}

function getDocMeta(name = '') {
  const ext = name.split('.').pop().toLowerCase()
  const map = {
    pdf:  { label: 'PDF',  color: 'text-red-400',     bg: 'bg-red-900/30',     border: 'border-red-700/30'     },
    doc:  { label: 'DOC',  color: 'text-blue-400',    bg: 'bg-blue-900/30',    border: 'border-blue-700/30'    },
    docx: { label: 'DOCX', color: 'text-blue-400',    bg: 'bg-blue-900/30',    border: 'border-blue-700/30'    },
    xls:  { label: 'XLS',  color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-700/30' },
    xlsx: { label: 'XLSX', color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-700/30' },
    csv:  { label: 'CSV',  color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-700/30' },
    ppt:  { label: 'PPT',  color: 'text-orange-400',  bg: 'bg-orange-900/30',  border: 'border-orange-700/30'  },
    pptx: { label: 'PPTX', color: 'text-orange-400',  bg: 'bg-orange-900/30',  border: 'border-orange-700/30'  },
    txt:  { label: 'TXT',  color: 'text-slate-400',   bg: 'bg-slate-800/40',   border: 'border-slate-600/30'   },
  }
  return map[ext] || { label: ext.toUpperCase() || 'FILE', color: 'text-slate-400', bg: 'bg-slate-800/40', border: 'border-slate-600/30' }
}

/** FileReader → base64 string (no data-URL prefix) */
const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload  = () => resolve(r.result.split(',')[1])
    r.onerror = reject
    r.readAsDataURL(file)
  })

/** Try to pull a JSON object out of Claude's response, even if wrapped in markdown */
function parseExtracted(raw) {
  try { return JSON.parse(raw.trim()) } catch {}
  const block = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  if (block) { try { return JSON.parse(block[1]) } catch {} }
  const obj = raw.match(/\{[\s\S]+\}/)
  if (obj)   { try { return JSON.parse(obj[0])   } catch {} }
  throw new Error('Could not parse JSON from response')
}

/** Map extracted fields → GHL contact payload */
function toGHLPayload(data) {
  const nameParts = [data.firstName, data.lastName].filter(Boolean)
  return {
    firstName:   data.firstName || '',
    lastName:    data.lastName  || '',
    email:       data.email     || '',
    phone:       data.phone     || '',
    address1:    data.address   || '',
    tags:        ['workhub-upload', ...(data.jobType ? [data.jobType] : [])],
    source:      'WorkHub Assistant',
    ...(nameParts.length ? { name: nameParts.join(' ') } : {}),
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────

function DocCard({ f, index, onRemove }) {
  const meta = getDocMeta(f.name)
  return (
    <div className={`relative flex items-center gap-3 rounded-xl border p-3 ${meta.bg} ${meta.border} group`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-[10px] tracking-wider ${meta.color} bg-black/20`}>
        {meta.label}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white truncate leading-tight">{f.name}</p>
        <p className="text-[11px] text-[#4a6080] mt-0.5">{formatBytes(f.file.size)}</p>
      </div>
      <button onClick={() => onRemove(index)}
        className="flex-shrink-0 w-7 h-7 rounded-full bg-[#0a1628] border border-[#1e3a6e] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove">
        <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function ImageThumb({ f, index, onRemove }) {
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden group">
      <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-1.5">
        <p className="text-[9px] text-white/80 truncate leading-tight max-w-[75%]">{f.name}</p>
        <button onClick={() => onRemove(index)}
          className="w-6 h-6 rounded-full bg-red-500/90 flex items-center justify-center flex-shrink-0"
          aria-label="Remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/** A single extracted contact card with Save to GHL button */
function ExtractionCard({ card, onSave }) {
  const { file, status, data, error, saved, saving } = card

  const Field = ({ label, value }) => {
    if (!value) return null
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold text-[#4a6080] uppercase tracking-wider">{label}</span>
        <span className="text-[13px] text-[#e2e8f0] break-words">{value}</span>
      </div>
    )
  }

  return (
    <div className="bg-[#0a1628] border border-[#152b55] rounded-2xl overflow-hidden">
      {/* Card header with thumbnail */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[#152b55]">
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#0f2040]">
          <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white truncate">{file.name}</p>
          <p className="text-[11px] text-[#4a6080] mt-0.5">{formatBytes(file.file.size)}</p>
        </div>
        {/* Status badge */}
        {status === 'processing' && (
          <div className="flex items-center gap-1.5 text-[#3b82f6]">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="text-[11px] font-medium">Analyzing…</span>
          </div>
        )}
        {status === 'done' && !saved && (
          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-900/30 border border-emerald-700/30 px-2 py-0.5 rounded-full">
            Extracted
          </span>
        )}
        {saved && (
          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-900/30 border border-emerald-700/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Saved to GHL
          </span>
        )}
        {status === 'error' && (
          <span className="text-[11px] font-semibold text-red-400 bg-red-900/30 border border-red-700/30 px-2 py-0.5 rounded-full">
            Failed
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {status === 'processing' && (
          <div className="flex flex-col gap-2 py-2">
            {[80, 60, 70].map((w, i) => (
              <div key={i} className={`h-3 bg-[#152b55] rounded animate-pulse`} style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {status === 'error' && (
          <p className="text-[13px] text-red-400 py-1">{error}</p>
        )}

        {status === 'done' && data && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 py-1">
            <Field label="First Name"  value={data.firstName} />
            <Field label="Last Name"   value={data.lastName}  />
            <Field label="Phone"       value={data.phone}     />
            <Field label="Email"       value={data.email}     />
            <div className="col-span-2">
              <Field label="Address"   value={data.address}   />
            </div>
            <Field label="Job Type"    value={data.jobType}   />
            <div className="col-span-2">
              <Field label="Notes"     value={data.notes}     />
            </div>
          </div>
        )}
      </div>

      {/* Footer action */}
      {status === 'done' && !saved && (
        <div className="px-4 pb-4">
          <button
            onClick={onSave}
            disabled={saving}
            className={`w-full py-3 rounded-xl font-semibold text-[14px] transition-all duration-150 flex items-center justify-center gap-2
              ${saving
                ? 'bg-[#0f2040] text-[#3a5070] cursor-not-allowed'
                : 'bg-gradient-to-r from-[#2563eb] to-[#3b82f6] text-white hover:opacity-90 active:scale-[0.99]'}`}
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Saving to GHL…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save to GoHighLevel
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────

export default function UploadScreen() {
  const session = getSession()
  const { locationId = '', businessName = '' } = session || {}

  const [files,          setFiles]          = useState([])
  const [description,    setDescription]    = useState('')
  const [isDragging,     setIsDragging]     = useState(false)
  const [isProcessing,   setIsProcessing]   = useState(false)
  const [cards,          setCards]          = useState([])   // extraction results
  const [toast,          setToast]          = useState(null) // { message, type }

  const cameraRef = useRef(null)
  const photosRef = useRef(null)
  const docsRef   = useRef(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  // ── File management ─────────────────────────────────────────────────────

  const addFiles = (incoming) => {
    const next = Array.from(incoming).map((f) => ({
      file: f,
      name: f.name,
      kind: f.type.startsWith('image/') ? 'image' : 'doc',
      url:  f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    }))
    if (!next.length) return
    setFiles((prev) => [...prev, ...next])
    setCards([]) // reset extraction results when new files added
  }

  const removeFile = (index) => {
    setFiles((prev) => {
      if (prev[index].url) URL.revokeObjectURL(prev[index].url)
      return prev.filter((_, i) => i !== index)
    })
    setCards([])
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const handleReset = () => {
    files.forEach((f) => f.url && URL.revokeObjectURL(f.url))
    setFiles([])
    setDescription('')
    setCards([])
  }

  const images = files.filter((f) => f.kind === 'image')
  const docs   = files.filter((f) => f.kind === 'doc')

  // ── Vision extraction ────────────────────────────────────────────────────

  const handleProcess = async () => {
    if (!images.length || isProcessing) return

    setIsProcessing(true)
    // Initialise a card per image, all pending
    const initCards = images.map((f) => ({ file: f, status: 'pending', data: null, error: null, saved: false, saving: false }))
    setCards(initCards)

    for (let i = 0; i < images.length; i++) {
      // Mark as processing
      setCards((prev) => prev.map((c, j) => j === i ? { ...c, status: 'processing' } : c))

      try {
        const base64    = await toBase64(images[i].file)
        const mediaType = images[i].file.type || 'image/jpeg'

        const res = await fetch('/api/claude', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            system:     VISION_SYSTEM,
            max_tokens: 512,
            model:      'claude-haiku-4-5-20251001',
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
                { type: 'text',  text: VISION_PROMPT(description) },
              ],
            }],
          }),
        })

        const body = await res.json()
        if (!res.ok || body.error) throw new Error(body.error || `Server error ${res.status}`)

        const data = parseExtracted(body.content)
        setCards((prev) => prev.map((c, j) => j === i ? { ...c, status: 'done', data } : c))
      } catch (err) {
        setCards((prev) => prev.map((c, j) =>
          j === i ? { ...c, status: 'error', error: err.message } : c
        ))
      }
    }

    setIsProcessing(false)
  }

  // ── GHL save ─────────────────────────────────────────────────────────────

  const handleSaveToGHL = async (cardIndex) => {
    const card = cards[cardIndex]
    if (!card?.data) return

    setCards((prev) => prev.map((c, i) => i === cardIndex ? { ...c, saving: true } : c))

    try {
      const res = await fetch('/api/ghl/contacts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...toGHLPayload(card.data), locationId }),
      })

      const body = await res.json()
      if (!res.ok || body.error) throw new Error(body.error || `GHL error ${res.status}`)

      const name = [card.data.firstName, card.data.lastName].filter(Boolean).join(' ') || 'Contact'
      setCards((prev) => prev.map((c, i) => i === cardIndex ? { ...c, saving: false, saved: true } : c))
      showToast(`${name} saved to GoHighLevel!`, 'success')
    } catch (err) {
      setCards((prev) => prev.map((c, i) => i === cardIndex ? { ...c, saving: false } : c))
      showToast(`Save failed: ${err.message}`, 'error')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#050d1a] overflow-y-auto">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <header className="flex-shrink-0 px-4 py-4 border-b border-[#152b55] bg-[#0a1628]">
        <div className="flex items-center justify-between">
          <h1 className="text-[18px] font-bold text-white tracking-tight">Upload Files</h1>
          {businessName && (
            <span className="text-[11px] font-semibold text-[#3b82f6] bg-[#0f2040] border border-[#1e3a6e] px-2.5 py-1 rounded-full">
              {businessName}
            </span>
          )}
        </div>
        <p className="text-[13px] text-[#4a6080] mt-0.5">Extract contacts from photos with AI · Save to GHL</p>
      </header>

      <div className="flex-1 px-4 py-5 flex flex-col gap-5 max-w-2xl mx-auto w-full">

        {/* ── Three action buttons ── */}
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2.5 py-5 rounded-2xl bg-[#0a1628] border border-[#152b55] hover:border-[#2563eb]/60 hover:bg-[#0f2040] active:scale-[0.97] transition-all duration-150">
            <div className="w-11 h-11 rounded-xl bg-[#152b55] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </div>
            <span className="text-[13px] font-semibold text-white">Camera</span>
            <span className="text-[10px] text-[#4a6080]">Take photo</span>
          </button>

          <button onClick={() => photosRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2.5 py-5 rounded-2xl bg-[#0a1628] border border-[#152b55] hover:border-[#2563eb]/60 hover:bg-[#0f2040] active:scale-[0.97] transition-all duration-150">
            <div className="w-11 h-11 rounded-xl bg-[#152b55] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" className="w-6 h-6">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <span className="text-[13px] font-semibold text-white">Photos</span>
            <span className="text-[10px] text-[#4a6080]">Choose multiple</span>
          </button>

          <button onClick={() => docsRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2.5 py-5 rounded-2xl bg-[#0a1628] border border-[#152b55] hover:border-[#2563eb]/60 hover:bg-[#0f2040] active:scale-[0.97] transition-all duration-150">
            <div className="w-11 h-11 rounded-xl bg-[#152b55] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-[13px] font-semibold text-white">Docs</span>
            <span className="text-[10px] text-[#4a6080]">PDF, Word, XLS…</span>
          </button>
        </div>

        {/* Hidden inputs */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => addFiles(e.target.files)} />
        <input ref={photosRef} type="file" accept="image/*,image/heic,image/heif" multiple className="hidden"
          onChange={(e) => addFiles(e.target.files)} />
        <input ref={docsRef} type="file" accept={DOC_ACCEPT} multiple className="hidden"
          onChange={(e) => addFiles(e.target.files)} />

        {/* ── Drag & drop zone ── */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          className={`rounded-2xl border-2 border-dashed transition-all duration-200 flex items-center justify-center gap-3 px-4 py-4
            ${isDragging ? 'border-[#3b82f6] bg-[#1e3a6e]/20 scale-[1.005]' : 'border-[#1e3a6e]/60'}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke={isDragging ? '#60a5fa' : '#3a5070'} strokeWidth="1.6" className="w-5 h-5 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <p className={`text-[13px] transition-colors ${isDragging ? 'text-[#60a5fa]' : 'text-[#3a5070]'}`}>
            {isDragging ? 'Release to add files' : 'Or drag & drop any files here'}
          </p>
        </div>

        {/* ── File count / clear ── */}
        {files.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[#7ca0c7] uppercase tracking-wider">
              Selected <span className="text-white font-bold normal-case">({files.length})</span>
              {images.length > 0 && docs.length > 0 && (
                <span className="text-[#3a5070] font-normal normal-case ml-1.5">
                  · {images.length} photo{images.length !== 1 ? 's' : ''}, {docs.length} doc{docs.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
            <button onClick={handleReset}
              className="text-[12px] text-[#4a6080] hover:text-red-400 transition-colors font-medium">
              Clear all
            </button>
          </div>
        )}

        {/* ── Image grid ── */}
        {images.length > 0 && (
          <div>
            {docs.length > 0 && (
              <p className="text-[11px] font-semibold text-[#4a6080] uppercase tracking-wider mb-2">Photos</p>
            )}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {files.map((f, i) =>
                f.kind === 'image'
                  ? <ImageThumb key={i} f={f} index={i} onRemove={removeFile} />
                  : null
              )}
              <button onClick={() => photosRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-[#1e3a6e] flex flex-col items-center justify-center gap-1.5 hover:border-[#2563eb]/60 hover:bg-[#0f2040] transition-all">
                <svg viewBox="0 0 24 24" fill="none" stroke="#3a5070" strokeWidth="2" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[9px] text-[#3a5070] font-medium">Add more</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Doc list ── */}
        {docs.length > 0 && (
          <div>
            {images.length > 0 && (
              <p className="text-[11px] font-semibold text-[#4a6080] uppercase tracking-wider mb-2">Documents</p>
            )}
            <div className="flex flex-col gap-2">
              {files.map((f, i) =>
                f.kind === 'doc'
                  ? <DocCard key={i} f={f} index={i} onRemove={removeFile} />
                  : null
              )}
            </div>
          </div>
        )}

        {/* ── Empty nudge ── */}
        {files.length === 0 && cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <p className="text-[14px] text-[#3a5070]">Nothing selected yet</p>
            <p className="text-[12px] text-[#2a3f58]">Use the buttons above or drag files in</p>
          </div>
        )}

        {/* ── Notes ── */}
        <div>
          <label className="block text-[13px] font-semibold text-[#7ca0c7] uppercase tracking-wider mb-2">
            Notes <span className="text-[#3a5070] font-normal normal-case">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 'Roof damage photos + signed estimate for Torres job'"
            rows={2}
            className="w-full bg-[#0a1628] border border-[#1e3a6e] rounded-xl px-4 py-3 text-[15px] text-[#e2e8f0] placeholder-[#3a5070] resize-none outline-none focus:border-[#3b82f6] transition-colors leading-relaxed"
          />
        </div>

        {/* ── Process button ── */}
        {cards.length === 0 && (
          <button
            onClick={handleProcess}
            disabled={!images.length || isProcessing}
            className={`w-full py-4 rounded-2xl font-bold text-[16px] tracking-wide transition-all duration-200
              ${images.length && !isProcessing
                ? 'bg-gradient-to-r from-[#2563eb] to-[#3b82f6] text-white shadow-xl shadow-blue-900/40 hover:shadow-blue-700/50 hover:scale-[1.01] active:scale-[0.99]'
                : 'bg-[#0f2040] text-[#3a5070] cursor-not-allowed'}`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2.5">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Extracting contacts…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {images.length > 0
                  ? `Extract from ${images.length} Photo${images.length !== 1 ? 's' : ''}`
                  : 'Select photos to extract'}
              </span>
            )}
          </button>
        )}

        {/* ── Extraction result cards ── */}
        {cards.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-[#7ca0c7] uppercase tracking-wider">
                Extracted Contacts ({cards.length})
              </p>
              <button onClick={() => setCards([])}
                className="text-[12px] text-[#4a6080] hover:text-[#7ca0c7] transition-colors font-medium">
                Re-process
              </button>
            </div>
            {cards.map((card, i) => (
              <ExtractionCard key={i} card={card} onSave={() => handleSaveToGHL(i)} />
            ))}
            {/* Attach docs note */}
            {docs.length > 0 && (
              <div className="bg-[#0a1628] border border-[#152b55] rounded-xl px-4 py-3 flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#4a6080" strokeWidth="1.8" className="w-5 h-5 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[13px] text-[#4a6080]">
                  {docs.length} document{docs.length !== 1 ? 's' : ''} attached — will be included when saving to GHL
                </p>
              </div>
            )}
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  )
}
