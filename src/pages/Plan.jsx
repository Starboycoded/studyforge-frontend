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
    const [planMeta, setPlanMeta] = useState(() => LS.get('sf_plan_meta', null));

    // Source mode: 'topic' or 'file'
    const [sourceMode, setSourceMode] = useState('topic');
    const [selectedFileId, setSelectedFileId] = useState(null);

    const uploadedFiles = LS.get('sf_files', []);

    async function generate() {
        let content = '';
        let subject = '';

        if (sourceMode === 'file') {
            if (!selectedFileId) { showToast('Please select a file first!'); return; }
            const file = uploadedFiles.find(f => f.id === selectedFileId);
            if (!file) { showToast('File not found. Please re-upload it.'); return; }
            if (!file.text || file.text.trim().length < 10) {
                showToast('No text extracted from this file. Remove and re-upload it.');
                return;
            }
            content = file.text;
            subject = file.name.replace(/\.[^.]+$/, '');
        } else {
            if (!topic.trim()) return;
            content = topic.trim();
            subject = topic.trim();
        }

        setLoading(true);
        try {
            // Send both `days` (explicit number) and `examDate` (human-readable fallback)
            const result = await apiFetch('/api/plan', {
                content,
                subject,
                hoursPerDay: Number(hoursPerDay),
                days: Number(days),
                examDate: `${Number(days)} days from now`,
            });

            // Backend returns { success, plan: { totalDays, plan: [...], tips, summary } }
            let raw = [];
            let meta = null;

            if (Array.isArray(result)) {
                raw = result;
            } else if (result?.plan) {
                const planObj = result.plan;
                if (Array.isArray(planObj)) {
                    raw = planObj;
                } else if (planObj && typeof planObj === 'object') {
                    if (Array.isArray(planObj.plan)) {
                        raw = planObj.plan;
                        meta = { totalDays: planObj.totalDays, tips: planObj.tips, summary: planObj.summary };
                    } else {
                        const found = Object.values(planObj).find(v => Array.isArray(v));
                        raw = found || [];
                    }
                }
            } else if (Array.isArray(result?.data)) {
                raw = result.data;
            }

            if (!raw.length) throw new Error('No plan returned from server');

            setPlan(raw);
            setPlanMeta(meta);
            LS.set('sf_plan', raw);
            LS.set('sf_plan_meta', meta);
            showToast('Study plan generated!');
        } catch (ex) {
            showToast('Error: ' + ex.message);
        } finally {
            setLoading(false);
        }
    }

    function clearPlan() {
        setPlan([]);
        setPlanMeta(null);
        LS.set('sf_plan', []);
        LS.set('sf_plan_meta', null);
    }

    const byDay = plan.reduce((acc, s) => {
        const dayKey = s.day !== undefined ? `Day ${s.day}` : (s.date || 'Day 1');
        if (!acc[dayKey]) acc[dayKey] = [];
        acc[dayKey].push(s);
        return acc;
    }, {});

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    const canGenerate = sourceMode === 'topic' ? topic.trim().length > 0 : !!selectedFileId;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ color: C.tx, fontSize: 20, fontWeight: 700 }}>📅 Study Plan</h2>

            <div style={card()}>
                <h3 style={{ color: C.tx, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Generate a Plan</h3>

                {/* Source toggle */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <button
                        onClick={() => setSourceMode('topic')}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: sourceMode === 'topic' ? C.a : C.s2, color: sourceMode === 'topic' ? '#fff' : C.mu, border: `1px solid ${sourceMode === 'topic' ? C.a : C.b}` }}
                    >
                        ✏️ From Topic
                    </button>
                    <button
                        onClick={() => setSourceMode('file')}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: sourceMode === 'file' ? C.a : C.s2, color: sourceMode === 'file' ? '#fff' : C.mu, border: `1px solid ${sourceMode === 'file' ? C.a : C.b}` }}
                    >
                        📁 From My Files
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {/* Topic input */}
                    {sourceMode === 'topic' && (
                        <div>
                            <label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Topic / Subject</label>
                            <input
                                style={inp()}
                                type="text"
                                placeholder="e.g. Machine Learning, Calculus, History..."
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && generate()}
                            />
                        </div>
                    )}

                    {/* File picker */}
                    {sourceMode === 'file' && (
                        <div>
                            <label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>Select a file to plan from:</label>
                            {uploadedFiles.length === 0 ? (
                                <div style={{ textAlign: 'center', color: C.mu, padding: '16px 0', fontSize: 13 }}>
                                    No files uploaded yet. Go to the 📁 Files tab to upload your study material.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {uploadedFiles.map(f => {
                                        const hasText = f.text && f.text.trim().length > 10;
                                        return (
                                            <div
                                                key={f.id}
                                                onClick={() => hasText && setSelectedFileId(f.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 12,
                                                    background: selectedFileId === f.id ? C.aD : C.s2,
                                                    border: `1px solid ${selectedFileId === f.id ? C.a : C.b}`,
                                                    borderRadius: 8, padding: '10px 12px',
                                                    cursor: hasText ? 'pointer' : 'not-allowed',
                                                    opacity: hasText ? 1 : 0.5,
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                <span style={{ fontSize: 20 }}>{f.name.endsWith('.pdf') ? '📄' : f.name.endsWith('.md') ? '📝' : '📃'}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ color: C.tx, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                                                    <div style={{ color: hasText ? C.mu : C.re, fontSize: 11 }}>{hasText ? formatSize(f.size) : '⚠️ No text — re-upload'}</div>
                                                </div>
                                                {selectedFileId === f.id && <span style={{ color: C.a, fontSize: 16 }}>✓</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Days + Hours (always shown) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Days</label>
                            <input style={inp()} type="number" min={1} max={30} value={days} onChange={e => setDays(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Hours/Day</label>
                            <input style={inp()} type="number" min={0.5} max={12} step={0.5} value={hoursPerDay} onChange={e => setHoursPerDay(e.target.value)} />
                        </div>
                    </div>
                    <button onClick={generate} disabled={loading || !canGenerate} style={btn('p')}>{loading ? 'Generating...' : '✨ Generate Plan'}</button>
                </div>
            </div>

            {planMeta && (
                <div style={{ ...card(), borderLeft: `3px solid ${C.a}` }}>
                    {planMeta.summary && <p style={{ color: C.tx, fontSize: 13, marginBottom: planMeta.tips?.length ? 10 : 0 }}>{planMeta.summary}</p>}
                    {planMeta.tips?.length > 0 && (<div><div style={{ color: C.mu, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>💡 Tips</div>{planMeta.tips.map((tip, i) => (<div key={i} style={{ color: C.mu, fontSize: 12, marginBottom: 4 }}>• {tip}</div>))}</div>)}
                </div>
            )}

            {plan.length > 0 && (
                <div style={card()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <h3 style={{ color: C.tx, fontSize: 15, fontWeight: 700 }}>Your Plan ({plan.length} days)</h3>
                        <button onClick={clearPlan} style={btn('d', { padding: '6px 12px', fontSize: 12 })}>Clear</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {Object.entries(byDay).map(([dayLabel, sessions]) => (
                            <div key={dayLabel}>
                                <div style={{ color: C.a, fontSize: 13, fontWeight: 700, marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${C.b}` }}>📅 {dayLabel}</div>
                                {sessions.map((s, i) => (
                                    <div key={i} style={{ background: C.s2, borderRadius: 8, padding: '10px 12px', marginBottom: 6, borderLeft: `3px solid ${C.a}` }}>
                                        <div style={{ color: C.tx, fontSize: 13, fontWeight: 600 }}>{s.focus || s.topic || s.title || s.subject || `Session ${i + 1}`}</div>
                                        {(s.duration || s.time || s.hours) && <div style={{ color: C.mu, fontSize: 12, marginTop: 2 }}>⏱ {s.duration || s.time || s.hours}</div>}
                                        {s.topics?.length > 0 && <div style={{ color: C.mu, fontSize: 12, marginTop: 4 }}>📖 {Array.isArray(s.topics) ? s.topics.join(', ') : s.topics}</div>}
                                        {s.tasks?.length > 0 && <div style={{ color: C.mu, fontSize: 12, marginTop: 4 }}>✅ {Array.isArray(s.tasks) ? s.tasks.join(' · ') : s.tasks}</div>}
                                        {s.description && <div style={{ color: C.mu, fontSize: 12, marginTop: 4 }}>{s.description}</div>}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {plan.length === 0 && !loading && (<div style={{ textAlign: 'center', color: C.mu, padding: 32 }}>No plan yet. Enter a topic or select a file above to generate your personalised study schedule!</div>)}
        </div>
    );
}
