import { NavLink } from 'react-router-dom'

const tabs = [
  {
    to: '/chat',
    label: 'Chat',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    to: '/upload',
    label: 'Upload',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    to: '/dashboard',
    label: 'Activity',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
]

export default function BottomNav() {
  return (
    <nav
      className="flex-shrink-0 border-t border-[#152b55] bg-[#0a1628]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        {tabs.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[60px] transition-colors duration-150
              ${isActive
                ? 'text-[#3b82f6]'
                : 'text-[#4a6080] hover:text-[#7ca0c7]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`transition-transform duration-150 ${isActive ? 'scale-110' : 'scale-100'}`}>
                  {icon(isActive)}
                </span>
                <span className={`text-[10px] font-semibold tracking-wide uppercase ${isActive ? 'text-[#3b82f6]' : 'text-[#4a6080]'}`}>
                  {label}
                </span>
                {/* Active indicator dot */}
                <span className={`w-1 h-1 rounded-full transition-all duration-150 ${isActive ? 'bg-[#3b82f6]' : 'bg-transparent'}`} />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
