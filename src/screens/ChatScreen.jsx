import { useState, useRef, useEffect, useCallback } from 'react'
import RobotAvatar from '../components/RobotAvatar'
import { getSession } from '../lib/session'

// ─── Constants ────────────────────────────────────────────────────────────

/** Personalised system prompt — includes the business name so Claude knows the context */
const buildSystemPrompt = (businessName) =>
  `You are WorkHub Assistant, an AI office assistant for ${businessName || 'a small business'} using GoHighLevel. You help them book appointments, manage contacts, send invoices, and run their business. Be brief, friendly, and action-oriented. Always confirm before taking any action in GoHighLevel.`

// Shown as visual examples only — excluded from API context (isSample: true)
const SAMPLE_MESSAGES = [
  {
    id: 'sample-1',
    role: 'assistant',
    isSample: true,
    text: "Hey! I'm your WorkHub Assistant. I can help you manage contacts, draft follow-ups, log jobs, or answer questions about your GoHighLevel account. What do you need?",
    timestamp: '9:41 AM',
  },
  {
    id: 'sample-2',
    role: 'user',
    isSample: true,
    text: "Can you pull up my last 5 open leads and flag any that haven't been contacted in over 3 days?",
    timestamp: '9:42 AM',
  },
  {
    id: 'sample-3',
    role: 'assistant',
    isSample: true,
    text: "Got it! I found 5 open leads. 3 of them haven't been contacted in over 3 days:\n\n• **Mike Torres** — 5 days idle · Roofing estimate\n• **Sandra Reyes** — 4 days idle · HVAC install\n• **James Polk** — 3 days idle · Gutter repair\n\nWant me to send a follow-up message to any of these?",
    timestamp: '9:42 AM',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────

function now() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** Read an SSE stream and call onText for each delta, returns full text */
async function readStream(response, onText) {
  const reader  = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer    = ''
  let full      = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (raw === '[DONE]') return full
      try {
        const { text, error } = JSON.parse(raw)
        if (error) throw new Error(error)
        if (text) { full += text; onText(full) }
      } catch { /* ignore malformed SSE frames */ }
    }
  }
  return full
}

// ─── MessageBubble ────────────────────────────────────────────────────────

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'

  // Renders **bold** and newlines
  const renderText = (text) =>
    text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
      return part.split('\n').map((line, j, arr) => (
        <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
      ))
    })

  if (isUser) {
    return (
      <div className="flex justify-end px-4 mb-3">
        <div className="max-w-[78%]">
          <div className="bg-[#2563eb] text-white rounded-2xl rounded-tr-sm px-4 py-3 text-[15px] leading-relaxed shadow-lg shadow-blue-900/30">
            {renderText(msg.text)}
          </div>
          <p className="text-[11px] text-[#4a6080] mt-1 text-right pr-1">{msg.timestamp}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 px-4 mb-3">
      <RobotAvatar size={36} />
      <div className="max-w-[78%]">
        <div className="bg-[#0f2040] border border-[#1e3a6e] text-[#e2e8f0] rounded-2xl rounded-tl-sm px-4 py-3 text-[15px] leading-relaxed shadow-md">
          {msg.text
            ? renderText(msg.text)
            : (
              /* streaming placeholder cursor */
              <span className="inline-block w-2 h-4 bg-[#3b82f6] rounded-sm opacity-80 animate-pulse" />
            )
          }
        </div>
        {msg.timestamp && (
          <p className="text-[11px] text-[#4a6080] mt-1 pl-1">{msg.timestamp}</p>
        )}
      </div>
    </div>
  )
}

// ─── TypingIndicator ──────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 px-4 mb-3">
      <RobotAvatar size={36} />
      <div className="bg-[#0f2040] border border-[#1e3a6e] rounded-2xl rounded-tl-sm px-4 py-3.5">
        <div className="flex gap-1.5 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-2 h-2 rounded-full bg-[#3b82f6] opacity-60"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────

export default function ChatScreen() {
  const session = getSession()
  const { businessName = '' } = session || {}

  const [messages,    setMessages]    = useState(SAMPLE_MESSAGES)
  const [input,       setInput]       = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const bottomRef    = useRef(null)
  const inputRef     = useRef(null)
  const recognitionRef = useRef(null)
  const baseInputRef   = useRef('') // text typed before mic started

  // ── Speech recognition ───────────────────────────────────────────────────
  const SpeechRecognition =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)

  const toggleListening = () => {
    // Stop if already listening
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Try Chrome or Safari.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous     = false   // auto-stops after a pause
    recognition.interimResults = true    // show words as you speak
    recognition.lang           = 'en-US'

    // Snapshot whatever the user already typed so we can append to it
    baseInputRef.current = input.trim()

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (e) => {
      let interim = ''
      let final   = ''
      for (const result of e.results) {
        if (result.isFinal) final   += result[0].transcript
        else                interim += result[0].transcript
      }
      const base       = baseInputRef.current
      const transcript = final || interim
      const joined     = base ? `${base} ${transcript}` : transcript
      setInput(joined.trim())

      // Auto-resize the textarea to fit new content
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
        inputRef.current.style.height =
          Math.min(inputRef.current.scrollHeight, 120) + 'px'
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
      // Hand focus back to the text field so Enter still sends
      setTimeout(() => inputRef.current?.focus(), 80)
    }

    recognition.onerror = (e) => {
      // 'aborted' fires when we call .stop() manually — not a real error
      if (e.error !== 'aborted') console.warn('Speech error:', e.error)
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Build the API-safe history (no sample messages)
  const buildApiHistory = useCallback((displayMsgs) =>
    displayMsgs
      .filter((m) => !m.isSample && !m.streaming)
      .map((m) => ({ role: m.role, content: m.text })),
    []
  )

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    const ts       = now()
    const userId   = Date.now()
    const userMsg  = { id: userId, role: 'user', text, timestamp: ts }
    const assistId = userId + 1

    // Optimistically add user message + empty streaming assistant bubble
    const nextMsgs = [...messages.filter((m) => !m.isSample), userMsg]
    setMessages([...nextMsgs, { id: assistId, role: 'assistant', text: '', streaming: true }])
    setInput('')
    setIsStreaming(true)

    // API context = real conversation only
    const apiHistory = buildApiHistory(nextMsgs)

    try {
      const res = await fetch('/api/claude', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages:   apiHistory,
          system:     buildSystemPrompt(businessName),
          stream:     true,
          max_tokens: 1024,
          model:      'claude-sonnet-4-6',
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error ${res.status}`)
      }

      const fullText = await readStream(res, (partial) => {
        setMessages((prev) =>
          prev.map((m) => m.id === assistId ? { ...m, text: partial } : m)
        )
      })

      // Finalise: remove streaming flag, add timestamp
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistId
            ? { ...m, text: fullText, streaming: false, timestamp: now() }
            : m
        )
      )
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistId
            ? {
                ...m,
                text:      `Sorry, I ran into a problem: **${err.message}**. Check your API key and try again.`,
                streaming: false,
                isError:   true,
                timestamp: now(),
              }
            : m
        )
      )
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const clearChat = () => setMessages(SAMPLE_MESSAGES)

  return (
    <div className="flex flex-col h-full bg-[#050d1a]">

      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3.5 border-b border-[#152b55] bg-[#0a1628]">
        <RobotAvatar size={38} />
        <div>
          <h1 className="text-[15px] font-bold text-white leading-tight tracking-tight">WorkHub Assistant</h1>
          {businessName && (
            <p className="text-[11px] font-semibold text-[#3b82f6] leading-tight mt-0.5">{businessName}</p>
          )}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow shadow-emerald-500/50" />
            <span className="text-[11px] text-emerald-400 font-medium">Connected to GoHighLevel</span>
          </div>
        </div>
        <button
          onClick={clearChat}
          title="Clear chat"
          className="ml-auto p-2 rounded-lg hover:bg-[#152b55] transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#4a6080" strokeWidth="1.8" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {/* Show typing dots only when streaming hasn't started yet */}
        {isStreaming && messages[messages.length - 1]?.text === '' && (
          <TypingIndicator />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-[#152b55] bg-[#0a1628]">
        <div className="flex items-end gap-2 bg-[#0f2040] border border-[#1e3a6e] rounded-2xl px-3 py-2.5 max-w-2xl mx-auto
          focus-within:border-[#2563eb]/70 transition-colors">

          {/* Mic button — live via Web Speech API */}
          <button
            onClick={toggleListening}
            disabled={isStreaming}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            className={`relative flex-shrink-0 p-1.5 rounded-lg transition-all duration-150 mb-0.5
              ${isListening
                ? 'text-red-400 bg-red-950/40'
                : 'text-[#4a6080] hover:text-[#3b82f6] hover:bg-[#152b55]'
              } disabled:opacity-40`}
          >
            {/* Pulse ring while listening */}
            {isListening && (
              <span className="absolute inset-0 rounded-lg bg-red-500/20 animate-ping" />
            )}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 relative">
              <rect x="9" y="3" width="6" height="10" rx="3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 11a7 7 0 0014 0M12 20v-3M8 20h8" />
            </svg>
          </button>

          {/* Textarea */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything or give me a task..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-[#e2e8f0] placeholder-[#3a5070] text-[15px] resize-none outline-none leading-relaxed disabled:opacity-50"
            style={{ maxHeight: '120px' }}
          />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 mb-0.5
              ${input.trim() && !isStreaming
                ? 'bg-[#2563eb] hover:bg-[#1d4ed8] shadow-lg shadow-blue-900/40 scale-100'
                : 'bg-[#152b55] scale-95 opacity-50'}`}
            aria-label="Send">
            {isStreaming
              ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                </svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
            }
          </button>
        </div>
        {isListening ? (
          <p className="text-center text-[11px] text-red-400 font-medium mt-2 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
            Listening… tap mic to stop
          </p>
        ) : (
          <p className="text-center text-[10px] text-[#2a3f58] mt-2">
            Always confirm before taking actions in GoHighLevel
          </p>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
