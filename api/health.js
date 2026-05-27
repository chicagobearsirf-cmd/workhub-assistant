export default function handler(req, res) {
  const anthropicKey =
    process.env.ANTHROPIC_API_KEY ||
    process.env.VITE_ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_KEY

  const ghlKey =
    process.env.GHL_API_KEY ||
    process.env.VITE_GHL_API_KEY ||
    process.env.GHL_API_KEY

  res.status(200).json({
    status: 'ok',
    keys: {
      anthropic: {
        ANTHROPIC_API_KEY:      !!process.env.ANTHROPIC_API_KEY,
        VITE_ANTHROPIC_API_KEY: !!process.env.VITE_ANTHROPIC_API_KEY,
        ANTHROPIC_KEY:          !!process.env.ANTHROPIC_KEY,
        resolved:               anthropicKey ? '✓ found' : '✗ missing',
      },
      ghl: {
        GHL_API_KEY:      !!process.env.GHL_API_KEY,
        VITE_GHL_API_KEY: !!process.env.VITE_GHL_API_KEY,
        resolved:         ghlKey ? '✓ found' : '✗ missing',
      },
    },
  })
}
