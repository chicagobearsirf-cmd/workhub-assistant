export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const ghlKey = process.env.GHL_API_KEY || process.env.VITE_GHL_API_KEY;

  if (!ghlKey) {
    return res.status(500).json({ error: 'GHL API key missing' });
  }

  const { firstName, lastName, phone, email, locationId } = req.body;

  if (!locationId) {
    return res.status(400).json({ error: 'locationId is required' });
  }

  try {
    const response = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ firstName, lastName, phone, email, locationId }),
    });

    const data = await response.json();
    console.log('[/api/ghl/contacts] GHL status:', response.status, JSON.stringify(data));

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || JSON.stringify(data) });
    }

    return res.status(200).json({ success: true, contact: data });
  } catch (err) {
    console.error('GHL fetch error:', err);
    return res.status(500).json({ error: err.message });
  }
}
