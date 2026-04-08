import React, { useState } from 'react';
import { C, card, btn, inp } from '../theme';
import { LS } from '../utils/storage';
import { apiFetch } from '../utils/ai';
export default function Plan({ showToast }) {
    const [topic, setTopic] = useState('');
    const [days, setDays] = useState(7);
    const [hoursPerDay, setHoursPerDay] = useState(2);
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState(() => LS.get('sf_plan', []));
    async function generate() {
        if (!topic.trim()) return;
        setLoading(true);
        try {
            const result = await apiFetch('/api/plan', { topic: topic.trim(), days: Number(days), hoursPerDay: Number(hoursPerDay) });
            let raw = Array.isArray(result) ? result : Array.isArray(result?.plan) ? result.plan : Array.isArray(result?.data) ? result.data : (result && typeof result === 'object' ? (Object.values(result).find(v => Array.isArray(v)) || []) : []);
            if (!raw.length) throw new Error('No plan returned from server');
            setPlan(raw); LS.set('sf_plan', raw);
            showToast('Study plan generated!');
        } catch (ex) { showToast('Error: ' + ex.message); } finally { setLoading(false); }
    }
    function clearPlan() { setPlan([]); LS.set('sf_plan', []); }
    const byDay = plan.reduce((acc, s) => { const day = s.day || s.date || 'Day 1'; if (!acc[day]) acc[day] = []; acc[day].push(s); return acc; }, {});
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ color: C.tx, fontSize: 20, fontWeight: 700 }}>📅 Study Plan</h2>
            <div style={card()}>
                <h3 style={{ color: C.tx, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Generate a Plan</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div><label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Topic / Subject</label><input style={inp()} type="text" placeholder="e.g. Machine Learning, Calculus..." value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Days</label><input style={inp()} type="number" min={1} max={30} value={days} onChange={e => setDays(e.target.value)} /></div>
                        <div><label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Hours/Day</label><input style={inp()} type="number" min={0.5} max={12} step={0.5} value={hoursPerDay} onChange={e => setHoursPerDay(e.target.value)} /></div>
                    </div>
                    <button onClick={generate} disabled={loading || !topic.trim()} style={btn('p')}>{loading ? 'Generating...' : '✨ Generate Plan'}</button>
                </div>
            </div>
            {plan.length > 0 && (
                <div style={card()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <h3 style={{ color: C.tx, fontSize: 15, fontWeight: 700 }}>Your Plan ({plan.length} sessions)</h3>
                        <button onClick={clearPlan} style={btn('d', { padding: '6px 12px', fontSize: 12 })}>Clear</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {Object.entries(byDay).map(([day, sessions]) => (
                            <div key={day}>
                                <div style={{ color: C.a, fontSize: 13, fontWeight: 700, marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${C.b}` }}>📅 {day}</div>
                                {sessions.map((s, i) => (
                                    <div key={i} style={{ background: C.s2, borderRadius: 8, padding: '10px 12px', marginBottom: 6, borderLeft: `3px solid ${C.a}` }}>
                                        <div style={{ color: C.tx, fontSize: 13, fontWeight: 600 }}>{s.topic || s.title || s.subject || `Session ${i+1}`}</div>
                                        {(s.duration || s.time || s.hours) && <div style={{ color: C.mu, fontSize: 12, marginTop: 2 }}>⏱ {s.duration || s.time || s.hours}</div>}
                                        {s.description && <div style={{ color: C.mu, fontSize: 12, marginTop: 4 }}>{s.description}</div>}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {plan.length === 0 && !loading && (<div style={{ textAlign: 'center', color: C.mu, padding: 32 }}>No plan yet. Enter a topic above to generate your personalised study schedule!</div>)}
        </div>
    );
}