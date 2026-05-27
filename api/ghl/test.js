export default async function handler(req, res) {
  const ghlKey = (process.env.GHL_API_KEY || process.env.VITE_GHL_API_KEY)?.trim()

  if (!ghlKey) {
    return res.status(200).json({
      error: 'No GHL key found in env',
      envKeys: Object.keys(process.env).filter(k => k.includes('GHL')),
    })
  }

  try {
    const r = await fetch('https://services.leadconnectorhq.com/contacts?limit=1', {
      headers: {
        'Authorization': `Bearer ${ghlKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
    })

    const responseText = await r.text()
    console.log('GHL test status:', r.status)
    console.log('GHL test body:', responseText)

    return res.status(200).json({
      keyFound: true,
      keyLength: ghlKey.length,
      keyPreview: ghlKey.slice(0, 6) + '...' + ghlKey.slice(-4),
      ghlStatus: r.status,
      ghlResponse: responseText,
    })
  } catch (err) {
    return res.status(200).json({ error: err.message })
  }
}
