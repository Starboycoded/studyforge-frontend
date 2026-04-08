const BASE = import.meta.env.VITE_API_URL || 'https://study-forge-usyo.onrender.com';
export async function apiFetch(endpoint, body = null) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not logged in');
    const opts = { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`${BASE}${endpoint}`, opts);
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || d.error || 'Request failed');
    return d;
}
export function parseJSON(text) {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try { return JSON.parse(clean); } catch { }
    const m = clean.match(/\[[\s\S]*\]/);
    if (m) try { return JSON.parse(m[0]); } catch { }
    return null;
}