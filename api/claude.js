import Anthropic from '@anthropic-ai/sdk'

// Increase body size limit to handle base64-encoded images (vision requests)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}

const anthropic = new Anthropic({
  apiKey: process.env.VITE_ANTHROPIC_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
}
