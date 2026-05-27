import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

const app = express()
const PORT = process.env.PORT || 3001

// Allow Vite dev server + local preview
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }))
// 50 MB limit to handle base64-encoded images
app.use(express.json({ limit: '50mb' }))

const anthropic = new Anthropic({
  apiKey: process.env.VITE_ANTHROPIC_API_KEY,
})

// ── POST /api/claude ──────────────────────────────────────────────────────
// Forwards to Anthropic. Supports streaming (SSE) and non-streaming modes.
app.post('/api/claude', async (req, res) => {
  const {
    messages,
    system,
    stream: useStream = false,
    max_tokens = 1024,
    model = 'claude-haiku-4-5-20251001',
  } = req.body

  if (!messages?.length) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  try {
    if (useStream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders()

      const stream = await anthropic.messages.create({
        model,
        max_tokens,
        ...(system ? { system } : {}),
        messages,
        stream: true,
      })

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
        }
      }

      res.write('data: [DONE]\n\n')
      res.end()
    } else {
      const response = await anthropic.messages.create({
        model,
        max_tokens,
        ...(system ? { system } : {}),
        messages,
      })
      res.json({ content: response.content[0]?.text ?? '' })
    }
  } catch (err) {
    console.error('[/api/claude]', err.message)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Claude API error' })
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    }
  }
})

// ── POST /api/ghl/contacts ────────────────────────────────────────────────
// Proxies contact creation to GoHighLevel.
// The agency API key stays server-side; locationId comes from the authenticated
// client session and is supplied in the request body.
app.post('/api/ghl/contacts', async (req, res) => {
  const apiKey = process.env.VITE_GHL_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'GHL API key not configured in .env' })
  }

  // locationId is per-client — sent by the frontend from the active session
  const { locationId, ...contactData } = req.body

  if (!locationId) {
    return res.status(400).json({ error: 'locationId is required (check client session)' })
  }

  const payload = { ...contactData, locationId }

  try {
    const ghlRes = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await ghlRes.json()

    if (!ghlRes.ok) {
      return res.status(ghlRes.status).json({ error: data.message || 'GHL API error', detail: data })
    }

    res.json(data)
  } catch (err) {
    console.error('[/api/ghl/contacts]', err.message)
    res.status(500).json({ error: err.message || 'Network error reaching GHL' })
  }
})

app.listen(PORT, () => {
  console.log(`🚀  API proxy → http://localhost:${PORT}`)
  console.log(`    Anthropic key: ${process.env.VITE_ANTHROPIC_API_KEY ? '✓ set' : '✗ missing'}`)
  console.log(`    GHL key:       ${process.env.VITE_GHL_API_KEY ? '✓ set' : '✗ missing'}`)
  console.log(`    GHL location:  ${process.env.VITE_GHL_LOCATION_ID ? '✓ set' : '✗ missing'}`)
})
