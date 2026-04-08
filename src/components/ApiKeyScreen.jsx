import React, { useState } from 'react';
import { C, card, btn, inp } from '../theme';
const BASE = import.meta.env.VITE_API_URL || 'https://study-forge-usyo.onrender.com';
export default function ApiKeyScreen({ onLogin }) {
    const [mode, setMode] = useState('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);
    async function submit(e) {
        e.preventDefault(); setErr(''); setLoading(true);
        try {
            const endpoint = mode === 'login' ? '/api/login' : '/api/register';
            const body = mode === 'login' ? { email, password } : { name, email, password };
            const r = await fetch(`${BASE}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await r.json();
            if (!r.ok) throw new Error(data.message || data.error || 'Request failed');
            localStorage.setItem('token', data.token);
            onLogin(data.user);
        } catch (ex) { setErr(ex.message); } finally { setLoading(false); }
    }
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, padding: 16 }}>
            <div style={{ ...card(), maxWidth: 400, width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: C.a, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 12 }}>📚</div>
                    <h1 style={{ color: C.tx, fontSize: 22, fontWeight: 700 }}>StudyForge</h1>
                    <p style={{ color: C.mu, fontSize: 13, marginTop: 4 }}>{mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}</p>
                </div>
                <div style={{ display: 'flex', background: C.s2, borderRadius: 8, padding: 4, marginBottom: 20, gap: 4 }}>
                    {['login', 'signup'].map(m => (
                        <button key={m} onClick={() => { setMode(m); setErr(''); }} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: mode === m ? C.a : 'transparent', color: mode === m ? '#fff' : C.mu, transition: 'all 0.2s' }}>
                            {m === 'login' ? 'Sign In' : 'Sign Up'}
                        </button>
                    ))}
                </div>
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {mode === 'signup' && (<div><label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Full Name</label><input style={inp()} type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required /></div>)}
                    <div><label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Email</label><input style={inp()} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                    <div><label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Password</label><input style={inp()} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></div>
                    {err && (<div style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid ${C.re}`, borderRadius: 8, padding: '10px 12px', color: C.re, fontSize: 13 }}>{err}</div>)}
                    <button type="submit" disabled={loading} style={{ ...btn('p'), marginTop: 4, padding: '12px 18px' }}>{loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}</button>
                </form>
            </div>
        </div>
    );
}