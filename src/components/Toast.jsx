import { useEffect } from 'react'

/**
 * Props:
 *   message  string
 *   type     'success' | 'error' | 'info'
 *   onClose  () => void   — called after 3.5 s or on manual dismiss
 */
export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  const styles = {
    success: {
      wrapper: 'bg-emerald-900/90 border-emerald-500/50',
      icon:    'text-emerald-400',
      text:    'text-emerald-100',
      path:    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />,
    },
    error: {
      wrapper: 'bg-red-900/90 border-red-500/50',
      icon:    'text-red-400',
      text:    'text-red-100',
      path:    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
    },
    info: {
      wrapper: 'bg-blue-900/90 border-blue-500/50',
      icon:    'text-blue-400',
      text:    'text-blue-100',
      path:    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    },
  }

  const s = styles[type] ?? styles.info

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl
        backdrop-blur-sm min-w-[260px] max-w-[90vw]
        animate-[slideDown_0.2s_ease-out]
        ${s.wrapper}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        className={`w-5 h-5 flex-shrink-0 ${s.icon}`}>
        {s.path}
      </svg>
      <p className={`text-[14px] font-medium flex-1 leading-snug ${s.text}`}>{message}</p>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4 h-4 ${s.icon}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
