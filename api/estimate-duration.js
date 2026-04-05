// Estimate audio duration for text content
// Uses average speaking rate of ~150 words per minute
export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { texts } = req.body;

    if (!texts || !Array.isArray(texts)) {
        return res.status(400).json({ error: 'texts array required' });
    }

    const durations = texts.map(text => {
        if (!text) return 0;
        const words = text.trim().split(/\s+/).length;
        // ~150 words per minute for meditation (slow, calm pace)
        return (words / 150) * 60;
    });

    return res.status(200).json({ durations });
}
