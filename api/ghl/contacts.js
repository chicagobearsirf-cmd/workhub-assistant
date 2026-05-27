export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.VITE_GHL_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'GHL API key not configured in environment' })
  }

  // locationId is per-client — sent from the authenticated session on the frontend
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
      return res
        .status(ghlRes.status)
        .json({ error: data.message || 'GHL API error', detail: data })
    }

    res.json(data)
  } catch (err) {
    console.error('[/api/ghl/contacts]', err.message)
    res.status(500).json({ error: err.message || 'Network error reaching GHL' })
  }
}
