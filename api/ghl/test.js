export default async function handler(req, res) {
  const ghlKey = (process.env.GHL_API_KEY || process.env.VITE_GHL_API_KEY)?.trim()

  if (!ghlKey) {
    return res.status(200).json({ error: 'No GHL key found in env', env: Object.keys(process.env).filter(k => k.includes('GHL')) })
  }

  // Try a simple GET to verify the key works at all
  try {
    const r = await fetch('https://rest.gohighlevel.com/v1/contacts/?limit=1', {
      headers: {
        'Authorization': `Bearer ${ghlKey}`,
        'Content-Type': 'application/json',
      },
    })
    const data = await r.json()
    return res.status(200).json({
      keyFound: true,
      keyLength: ghlKey.length,
      keyPreview: ghlKey.slice(0, 6) + '...' + ghlKey.slice(-4),
      ghlStatus: r.status,
      ghlResponse: data,
    })
  } catch (err) {
    return res.status(200).json({ error: err.message })
  }
}
