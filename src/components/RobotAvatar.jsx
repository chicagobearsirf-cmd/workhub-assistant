export default function RobotAvatar({ size = 32 }) {
  return (
    <div
      className="flex-shrink-0 rounded-xl bg-gradient-to-br from-[#1e3a6e] to-[#0f2040] border border-[#2563eb]/40 flex items-center justify-center shadow-lg shadow-blue-900/30"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        style={{ width: size * 0.6, height: size * 0.6 }}
      >
        {/* Head */}
        <rect x="5" y="6" width="14" height="11" rx="2" fill="#3b82f6" opacity="0.9" />
        {/* Eyes */}
        <circle cx="9" cy="10" r="1.5" fill="#bfdbfe" />
        <circle cx="15" cy="10" r="1.5" fill="#bfdbfe" />
        {/* Mouth */}
        <rect x="8.5" y="13" width="7" height="1.5" rx="0.75" fill="#93c5fd" />
        {/* Antenna */}
        <line x1="12" y1="6" x2="12" y2="3.5" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="3" r="1" fill="#60a5fa" />
        {/* Neck */}
        <rect x="10.5" y="17" width="3" height="1.5" rx="0.5" fill="#2563eb" />
        {/* Body stub */}
        <rect x="8" y="18.5" width="8" height="1.5" rx="0.75" fill="#1d4ed8" />
      </svg>
    </div>
  )
}
