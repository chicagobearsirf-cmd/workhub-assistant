import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clients } from '../config/clients'
import { setSession } from '../lib/session'
import RobotAvatar from '../components/RobotAvatar'

const MAX_PIN = 6  // visual boxes shown

export default function LoginScreen() {
  const [pin,       setPin]       = useState('')
  const [error,     setError]     = useState('')
  const [isShaking, setIsShaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef  = useRef(null)
  const navigate  = useNavigate()

  // Focus the hidden input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  const handlePinChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, MAX_PIN)
    setPin(val)
    setError('')
  }

  const triggerShake = () => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 520)
  }

  const handleSubmit = () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits.')
      triggerShake()
      return
    }

    setIsLoading(true)

    // Small artificial delay so it doesn't feel instant (also prevents brute-force UX)
    setTimeout(() => {
      const match = clients.find((c) => c.pin === pin)

      if (match) {
        setSession({ locationId: match.locationId, businessName: match.businessName })
        navigate('/chat', { replace: true })
      } else {
        setPin('')
        setError('Invalid PIN. Try again.')
        triggerShake()
        setIsLoading(false)
        // Re-focus so they can type immediately
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    }, 400)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="min-h-screen bg-[#050d1a] flex flex-col items-center justify-between px-4 py-10">

      {/* Top spacer */}
      <div />

      {/* ── Login card ── */}
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Logo block */}
        <div className="flex flex-col items-center gap-4">
          {/* Glow ring around avatar */}
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-[#2563eb]/20 blur-xl scale-150" />
            <div className="relative">
              <RobotAvatar size={72} />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-[26px] font-bold text-white tracking-tight">
              WorkHub Assistant
            </h1>
            <p className="text-[14px] text-[#4a6080] mt-1">
              Your AI business companion
            </p>
          </div>
        </div>

        {/* ── PIN card ── */}
        <div className="w-full bg-[#0a1628] border border-[#152b55] rounded-3xl p-7 flex flex-col gap-6 shadow-2xl shadow-black/40">

          <div className="text-center">
            <p className="text-[15px] font-semibold text-[#c8d6e5]">Enter your workspace PIN</p>
          </div>

          {/* PIN boxes */}
          <div
            className={`flex flex-col items-center gap-3 ${isShaking ? 'shake' : ''}`}
            onClick={() => inputRef.current?.focus()}
          >
            <div className="flex gap-3 cursor-pointer">
              {Array.from({ length: MAX_PIN }).map((_, i) => {
                const filled  = i < pin.length
                const active  = i === pin.length && !isLoading
                return (
                  <div
                    key={i}
                    className={`w-11 h-14 rounded-xl border-2 flex items-center justify-center transition-all duration-150
                      ${filled
                        ? 'border-[#3b82f6] bg-[#0f2040] shadow-lg shadow-blue-900/30'
                        : active
                        ? 'border-[#2563eb]/60 bg-[#0a1628] shadow-md shadow-blue-900/20'
                        : 'border-[#1a2e4a] bg-[#070f1c]'
                      }`}
                  >
                    {filled && (
                      <div className="w-3 h-3 rounded-full bg-[#3b82f6] shadow shadow-blue-400/50" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Hidden input that actually captures keystrokes */}
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={handlePinChange}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              aria-label="PIN"
              className="sr-only"
            />
          </div>

          {/* Error message */}
          <div className="min-h-[20px] text-center">
            {error && (
              <p className="text-[13px] text-red-400 font-medium">{error}</p>
            )}
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={pin.length < 4 || isLoading}
            className={`w-full py-4 rounded-2xl font-bold text-[16px] tracking-wide transition-all duration-200 flex items-center justify-center gap-2
              ${pin.length >= 4 && !isLoading
                ? 'bg-gradient-to-r from-[#2563eb] to-[#3b82f6] text-white shadow-xl shadow-blue-900/40 hover:shadow-blue-700/50 hover:scale-[1.01] active:scale-[0.99]'
                : 'bg-[#0f2040] text-[#3a5070] cursor-not-allowed'
              }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Verifying…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                Enter Workspace
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          <div className="w-4 h-px bg-[#1a2e4a]" />
          <p className="text-[11px] text-[#2a3f58] font-medium tracking-wide uppercase">
            Powered by
          </p>
          <div className="w-4 h-px bg-[#1a2e4a]" />
        </div>
        <p className="text-[13px] font-semibold text-[#3a5070] tracking-tight">
          AdWise Guys
        </p>
      </div>

    </div>
  )
}
