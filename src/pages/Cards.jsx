import React, { useState } from 'react';
import { C, card, btn, inp } from '../theme';
import { LS } from '../utils/storage';
import { apiFetch } from '../utils/ai';
import { sm2 } from '../utils/sm2';


export default function Cards({ showToast }) {
    const [cards, setCards] = useState(() => LS.get('sf_cards', []));
    const [selC, setSelC] = useState('All');
    const [generating, setGenerating] = useState(false);
    const [topic, setTopic] = useState('');
    const [reviewMode, setReviewMode] = useState(false);
    const [reviewQueue, setReviewQueue] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [flipped, setFlipped] = useState(false);

    const [sourceMode, setSourceMode] = useState('topic');
    const [selectedFileId, setSelectedFileId] = useState(null);

    const uploadedFiles = LS.get('sf_files', []);

    function saveCards(updated) { setCards(updated); LS.set('sf_cards', updated); }

    const courses = ['All', ...new Set(cards.map(c => c.course).filter(Boolean))];
    const filtered = selC === 'All' ? cards : cards.filter(c => c.course === selC);
    const now = new Date();
    const dueCards = filtered.filter(c => !c.due || new Date(c.due) <= now);

    async function generateCards() {
        let content = '';
        let courseName = '';

        if (sourceMode === 'file') {
            if (!selectedFileId) { showToast('Please select a file first!'); return; }
            const file = uploadedFiles.find(f => f.id === selectedFileId);
            if (!file) { showToast('File not found. Please re-upload it.'); return; }
            if (!file.text || file.text.trim().length < 10) {
                showToast('⚠️ No text extracted from this file. Remove it and re-upload.');
                return;
            }
            content = file.text;
            courseName = file.name.replace(/\.[^.]+$/, '');
        } else {
            if (!topic.trim()) return;
            content = topic.trim();
            courseName = topic.trim();
        }

        setGenerating(true);
        try {
            const result = await apiFetch('/api/flashcards', { content, count: 10 });
            const raw = Array.isArray(result) ? result : (result.flashcards || result.cards || []);
            if (!raw.length) throw new Error('No flashcards returned');
            const newCards = raw.map((c, i) => ({
                id: 'c' + Date.now() + i,
                q: c.front || c.q || c.question || '',
                a: c.back || c.a || c.answer || '',
                course: c.topic || courseName,
                ef: 2.5, reps: 0, interval: 1, due: null,
            }));
            saveCards([...cards, ...newCards]);
            showToast(`${newCards.length} flashcards generated!`);
            setTopic('');
        } catch (ex) { showToast('Error: ' + ex.message); } finally { setGenerating(false); }
    }

    function startReview() {
        if (!dueCards.length) { showToast('No cards due for review!'); return; }
        setReviewQueue([...dueCards]); setCurrentIdx(0); setFlipped(false); setReviewMode(true);
    }

    function rate(q) {
        const card = reviewQueue[currentIdx];
        const updated = sm2(card, q);
        saveCards(cards.map(c => c.id === card.id ? updated : c));
        if (currentIdx + 1 >= reviewQueue.length) { setReviewMode(false); showToast('Review session complete! 🎉'); }
        else { setCurrentIdx(i => i + 1); setFlipped(false); }
    }

    function deleteCard(id) { saveCards(cards.filter(c => c.id !== id)); }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    if (reviewMode && reviewQueue.length > 0) {
        const current = reviewQueue[currentIdx];
        const progress = (currentIdx / reviewQueue.length) * 100;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => setReviewMode(false)} style={btn('', { padding: '6px 12px', fontSize: 13 })}>← Back</button>
                    <div style={{ flex: 1, background: C.s2, borderRadius: 4, height: 6 }}>
                        <div style={{ width: `${progress}%`, background: C.a, height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ color: C.mu, fontSize: 13 }}>{currentIdx + 1}/{reviewQueue.length}</span>
                </div>
                <div onClick={() => setFlipped(f => !f)} style={{ ...card({ padding: 32, minHeight: 200, cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: flipped ? `linear-gradient(135deg, ${C.a}22, ${C.pu}22)` : C.s, transition: 'background 0.3s' }) }}>
                    <div style={{ color: C.mu, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>{flipped ? '✅ ANSWER' : '❓ QUESTION'} — {current.course}</div>
                    <div style={{ color: C.tx, fontSize: 18, fontWeight: 600, lineHeight: 1.5 }}>{flipped ? current.a : current.q}</div>
                    {!flipped && <div style={{ color: C.mu, fontSize: 12, marginTop: 16 }}>Tap to reveal answer</div>}
                </div>
                {flipped && (
                    <div style={card()}>
                        <p style={{ color: C.mu, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>How well did you know this?</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {[{ q: 0, label: '💥 Forgot', color: C.re }, { q: 2, label: '😕 Hard', color: '#f97316' }, { q: 3, label: '🙂 OK', color: C.bl }, { q: 4, label: '😊 Good', color: C.gr }, { q: 5, label: '🤩 Easy', color: C.pu }].map(r => (
                                <button key={r.q} onClick={() => rate(r.q)} style={{ background: r.color + '22', border: `1px solid ${r.color}44`, borderRadius: 8, padding: '10px 4px', cursor: 'pointer', color: r.color, fontSize: 12, fontWeight: 600 }}>{r.label}</button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ color: C.tx, fontSize: 20, fontWeight: 700 }}>🃏 Flashcards</h2>

            <div style={card()}>
                <h3 style={{ color: C.tx, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Generate Flashcards</h3>

                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <button onClick={() => setSourceMode('topic')} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: sourceMode === 'topic' ? C.a : C.s2, color: sourceMode === 'topic' ? '#fff' : C.mu, border: `1px solid ${sourceMode === 'topic' ? C.a : C.b}` }}>✏️ From Topic</button>
                    <button onClick={() => setSourceMode('file')} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: sourceMode === 'file' ? C.a : C.s2, color: sourceMode === 'file' ? '#fff' : C.mu, border: `1px solid ${sourceMode === 'file' ? C.a : C.b}` }}>📁 From My Files</button>
                </div>

                {sourceMode === 'topic' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input style={inp({ flex: 1 })} type="text" placeholder="Enter a topic to generate cards..." value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generateCards()} />
                        <button onClick={generateCards} disabled={generating || !topic.trim()} style={btn('p')}>{generating ? '...' : 'Generate'}</button>
                    </div>
                )}

                {sourceMode === 'file' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {uploadedFiles.length === 0 ? (
                            <div style={{ textAlign: 'center', color: C.mu, padding: '16px 0', fontSize: 13 }}>No files uploaded yet. Go to the 📁 Files tab to upload your study material.</div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {uploadedFiles.map(f => {
                                        const hasText = f.text && f.text.trim().length > 10;
                                        return (
                                            <div key={f.id} onClick={() => hasText && setSelectedFileId(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: selectedFileId === f.id ? C.aD : C.s2, border: `1px solid ${selectedFileId === f.id ? C.a : C.b}`, borderRadius: 8, padding: '10px 12px', cursor: hasText ? 'pointer' : 'not-allowed', opacity: hasText ? 1 : 0.5, transition: 'all 0.15s' }}>
                                                <span style={{ fontSize: 20 }}>{f.name.endsWith('.pdf') ? '📄' : f.name.endsWith('.md') ? '📝' : '📃'}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ color: C.tx, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                                                    <div style={{ color: hasText ? C.mu : C.re, fontSize: 11 }}>
                                                        {hasText ? formatSize(f.size) : '⚠️ No text — re-upload in Files tab'}
                                                    </div>
                                                </div>
                                                {selectedFileId === f.id && <span style={{ color: C.a, fontSize: 16 }}>✓</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                                <button onClick={generateCards} disabled={generating || !selectedFileId} style={btn('p')}>
                                    {generating ? 'Generating...' : selectedFileId ? `🃏 Generate from ${uploadedFiles.find(f => f.id === selectedFileId)?.name.split('.')[0]}` : 'Select a file above'}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {cards.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {courses.map(c => (<button key={c} onClick={() => setSelC(c)} style={{ background: selC === c ? C.a : C.s2, color: selC === c ? '#fff' : C.mu, border: `1px solid ${selC === c ? C.a : C.b}`, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{c}</button>))}
                    <div style={{ marginLeft: 'auto' }}><button onClick={startReview} disabled={!dueCards.length} style={btn('p', { padding: '8px 16px' })}>🔁 Review ({dueCards.length} due)</button></div>
                </div>
            )}

            {filtered.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {filtered.map(c => (
                        <div key={c.id} style={card()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ background: C.aD, color: C.a, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{c.course}</span>
                                <button onClick={() => deleteCard(c.id)} style={{ background: 'transparent', border: 'none', color: C.mu, cursor: 'pointer', fontSize: 14 }}>✕</button>
                            </div>
                            <div style={{ color: C.tx, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{c.q}</div>
                            <div style={{ color: C.mu, fontSize: 12, borderTop: `1px solid ${C.b}`, paddingTop: 8 }}>{c.a}</div>
                            {c.due && <div style={{ color: new Date(c.due) <= now ? C.re : C.gr, fontSize: 11, marginTop: 6 }}>{new Date(c.due) <= now ? '⏰ Due now' : `📅 Due ${new Date(c.due).toLocaleDateString()}`}</div>}
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', color: C.mu, padding: 32 }}>{cards.length === 0 ? 'No flashcards yet. Generate some above or upload a file!' : `No cards in "${selC}".`}</div>
            )}
        </div>
    );
}
