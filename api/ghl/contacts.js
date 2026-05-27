export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const ghlKey = (process.env.GHL_API_KEY || process.env.VITE_GHL_API_KEY)?.trim();

  if (!ghlKey) {
    return res.status(500).json({ error: 'GHL API key missing' });
  }

  const { firstName, lastName, phone, email, locationId } = req.body;

  if (!locationId) {
    return res.status(400).json({ error: 'locationId is required' });
  }

  try {
    const response = await fetch('https://services.leadconnectorhq.com/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghlKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ firstName, lastName, phone, email, locationId }),
    });

    const responseText = await response.text();
    console.log('GHL response status:', response.status);
    console.log('GHL response body:', responseText);

    if (!response.ok) {
      return res.status(response.status).json({ error: responseText });
    }

    const data = JSON.parse(responseText);
    return res.status(200).json({ success: true, contact: data });
  } catch (err) {
    console.error('GHL fetch error:', err);
    return res.status(500).json({ error: err.message });
  }
}
