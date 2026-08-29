// ElevenLabs TTS proxy — returns audio/mpeg for Jarvis voice
// Voice: Adam (pNInz6obpgDQGcFmaJgB) — deep male, works on all devices including Chromebook

const VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam

export async function POST(request) {
  const secret = request.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response('ELEVENLABS_API_KEY not set in Vercel env vars', { status: 503 });
  }

  let text;
  try {
    ({ text } = await request.json());
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  if (!text?.trim()) return new Response('No text', { status: 400 });

  // Truncate to avoid burning quota on very long responses
  const truncated = text.slice(0, 500);

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: truncated,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.80,
          style: 0.15,
          use_speaker_boost: true,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('ElevenLabs error:', res.status, err);
      return new Response(`ElevenLabs error: ${res.status}`, { status: 502 });
    }

    const audio = await res.arrayBuffer();
    return new Response(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
        'Content-Length': String(audio.byteLength),
      },
    });
  } catch (err) {
    console.error('TTS route error:', err);
    return new Response('TTS failed', { status: 502 });
  }
}
