const BASE = import.meta.env.VITE_API_URL ?? '/api';

export async function fetchMatchAnalytics(eventId) {
  if (!eventId) throw new Error('Match event ID is required');
  const res = await fetch(`${BASE}/matches/${eventId}/analytics`);
  if (!res.ok) {
    if (res.status === 404) {
      return null;
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to fetch match analytics (${res.status})`);
  }
  return res.json();
}

export async function fetchPrematchPrediction({ league, home, away }) {
  const params = new URLSearchParams({ league, home, away });
  const res = await fetch(`${BASE}/predict/prematch?${params.toString()}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to fetch prematch prediction (${res.status})`);
  }
  return res.json();
}

export async function fetchModelAccuracy(league = 'all') {
  const res = await fetch(`${BASE}/models/accuracy?league=${encodeURIComponent(league)}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to fetch model accuracy (${res.status})`);
  }
  return res.json();
}

export async function checkApiHealth() {
  const res = await fetch(`${BASE}/health`);
  return res.ok;
}

export async function fetchReplayMatches() {
  const res = await fetch(`${BASE}/replay/matches`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to fetch replay matches (${res.status})`);
  }
  return res.json();
}

export async function fetchReplayMeta(matchId) {
  const res = await fetch(`${BASE}/replay/${matchId}/meta`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to fetch replay meta (${res.status})`);
  }
  return res.json();
}

export async function fetchReplayFrames(matchId, chunk) {
  const res = await fetch(`${BASE}/replay/${matchId}/frames?chunk=${chunk}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to fetch replay chunk ${chunk} (${res.status})`);
  }
  return res.json();
}
