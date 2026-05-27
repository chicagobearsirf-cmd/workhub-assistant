import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, clearSession } from '../lib/session'
import { getActivity, relativeTime } from '../lib/activity'

// ─── Logout confirmation dialog ───────────────────────────────────────────

function LogoutDialog({ onCancel, onConfirm }) {
  return (
    // Full-screen dimmed overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(5, 13, 26, 0.85)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}            // tap outside = cancel
    >
      <div
        className="w-full max-w-sm bg-[#0a1628] border border-[#1e3a6e] rounded-3xl p-7 flex flex-col gap-5 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}  // prevent overlay click-through
      >
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-red-950/40 border border-red-800/40 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.8" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
        </div>

        {/* Copy */}
        <div className="text-center">
          <h2 className="text-[17px] font-bold text-white">Sign out?</h2>
          <p className="text-[13px] text-[#7ca0c7] mt-2 leading-relaxed">
            You will need your PIN to log back in.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onConfirm}
            className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-[15px] transition-colors"
          >
            Yes, Log Out
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3.5 rounded-2xl border border-[#1e3a6e] text-[#7ca0c7] hover:bg-[#0f2040] hover:text-white font-semibold text-[15px] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}


const icons = {
  contact: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  message: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  photo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
}

const iconColors = {
  contact: { bg: 'bg-violet-900/40', text: 'text-violet-400', border: 'border-violet-700/30' },
  message: { bg: 'bg-blue-900/40', text: 'text-blue-400', border: 'border-blue-700/30' },
  photo: { bg: 'bg-cyan-900/40', text: 'text-cyan-400', border: 'border-cyan-700/30' },
}

function ActionCard({ action }) {
  const color = iconColors[action.icon] || iconColors.contact

  return (
    <div className="bg-[#0a1628] border border-[#152b55] rounded-2xl p-4 flex items-start gap-3.5 hover:border-[#1e3a6e] transition-colors">
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${color.bg} ${color.text} ${color.border}`}>
        {icons[action.icon]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[14px] font-semibold text-white leading-tight">{action.title}</p>
          <span className="text-[11px] text-[#3a5070] flex-shrink-0 mt-0.5">{relativeTime(action.timestamp)}</span>
        </div>
        <p className="text-[13px] text-[#7ca0c7] mt-1 leading-snug">{action.description}</p>
      </div>

      {/* Success dot */}
      <div className="flex-shrink-0 mt-1">
        <span className="w-2 h-2 rounded-full bg-emerald-400 block shadow shadow-emerald-500/50" />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#0f2040] border border-[#1e3a6e] flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="#3a5070" strokeWidth="1.5" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="text-[16px] font-semibold text-[#7ca0c7]">No actions yet</p>
      <p className="text-[13px] text-[#3a5070] mt-1.5 max-w-[240px] leading-relaxed">
        Actions you take in Chat or Upload will appear here with timestamps.
      </p>
    </div>
  )
}

export default function DashboardScreen() {
  const navigate = useNavigate()
  const session  = getSession()
  const { businessName = '' } = session || {}

  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [actions, setActions] = useState([])

  // Load activity log from localStorage on mount and whenever the tab regains focus
  useEffect(() => {
    const load = () => setActions(getActivity())
    load()
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [])

  const handleLogoutConfirmed = () => {
    clearSession()
    navigate('/', { replace: true })
  }

  // Count only actions logged today
  const todayStart   = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayCount   = actions.filter((a) => new Date(a.timestamp) >= todayStart).length
  const successCount = actions.filter((a) => a.status === 'success').length

  return (
    <div className="flex flex-col h-full bg-[#050d1a] overflow-y-auto">
      {showLogoutDialog && (
        <LogoutDialog
          onCancel={() => setShowLogoutDialog(false)}
          onConfirm={handleLogoutConfirmed}
        />
      )}

      {/* Header */}
      <header className="flex-shrink-0 px-4 py-4 border-b border-[#152b55] bg-[#0a1628]">
        <div className="flex items-center justify-between">
          <h1 className="text-[18px] font-bold text-white tracking-tight">Activity</h1>
          {businessName && (
            <span className="text-[11px] font-semibold text-[#3b82f6] bg-[#0f2040] border border-[#1e3a6e] px-2.5 py-1 rounded-full">
              {businessName}
            </span>
          )}
        </div>
        <p className="text-[13px] text-[#4a6080] mt-0.5">Recent actions & automations</p>
      </header>

      <div className="flex-1 px-4 py-5 flex flex-col gap-5 max-w-2xl mx-auto w-full">

        {/* Stats bar */}
        {actions.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Today', value: todayCount, color: 'text-[#3b82f6]' },
              { label: 'Success', value: successCount, color: 'text-emerald-400' },
              { label: 'Pending', value: 0, color: 'text-amber-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#0a1628] border border-[#152b55] rounded-xl p-3 text-center">
                <p className={`text-[22px] font-bold tabular-nums ${color}`}>{value}</p>
                <p className="text-[11px] text-[#4a6080] font-semibold uppercase tracking-wide mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Recent Actions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold text-[#7ca0c7] uppercase tracking-wider">
              Recent Actions
            </p>
            {actions.length > 0 && (
              <button className="text-[12px] text-[#3b82f6] hover:text-[#60a5fa] font-medium transition-colors">
                View all
              </button>
            )}
          </div>

          {actions.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-3">
              {actions.map((action) => (
                <ActionCard key={action.id} action={action} />
              ))}
            </div>
          )}
        </div>

        {/* Connected services */}
        <div className="bg-[#0a1628] border border-[#152b55] rounded-2xl p-4">
          <p className="text-[13px] font-semibold text-[#7ca0c7] uppercase tracking-wider mb-3">
            Connected Services
          </p>
          <div className="flex flex-col gap-2.5">
            {[
              { name: 'GoHighLevel CRM', status: 'connected', color: 'text-emerald-400', dot: 'bg-emerald-400' },
              { name: 'Anthropic AI', status: 'awaiting key', color: 'text-amber-400', dot: 'bg-amber-400' },
              { name: 'Webhooks', status: 'not configured', color: 'text-[#4a6080]', dot: 'bg-[#4a6080]' },
            ].map(({ name, status, color, dot }) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                  <span className="text-[14px] text-[#c8d6e5]">{name}</span>
                </div>
                <span className={`text-[12px] font-medium ${color}`}>{status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Logout ── */}
        <button
          onClick={() => setShowLogoutDialog(true)}
          className="w-full py-3.5 rounded-2xl border border-[#1a2e4a] text-[#4a6080] hover:border-red-800/60 hover:text-red-400 hover:bg-red-950/20 transition-all duration-200 text-[14px] font-medium flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>

        <div className="h-2" />
      </div>
    </div>
  )
}
