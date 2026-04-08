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
    function saveCards(updated) { setCards(updated); LS.set('sf_cards', updated); }
    const courses = ['All', ...new Set(cards.map(c => c.course).filter(Boolean))];
    const filtered = selC === 'All' ? cards : cards.filter(c => c.course === selC);
    const now = new Date();
    const dueCards = filtered.filter(c => !c.due || new Date(c.due) <= now);
    async function generateCards() {
        if (!topic.trim()) return;
        setGenerating(true);
        try {
            const result = await apiFetch('/api/flashcards', { topic: topic.trim() });
            const raw = Array.isArray(result) ? result : (result.flashcards || result.cards || []);
            if (!raw.length) throw new Error('No flashcards returned');
            const newCards = raw.map((c, i) => ({ id: 'c' + Date.now() + i, q: c.front || c.q || c.question || '', a: c.back || c.a || c.answer || '', course: c.topic || (selC !== 'All' ? selC : topic.trim()), ef: 2.5, reps: 0, interval: 1, due: null }));
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
    if (reviewMode && reviewQueue.length > 0) {
        const current = reviewQueue[currentIdx];
        const progress = (currentIdx / reviewQueue.length) * 100;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => setReviewMode(false)} style={btn('', { padding: '6px 12px', fontSize: 13 })}>← Back</button>
                    <div style={{ flex: 1, background: C.s2, borderRadius: 4, height: 6 }}><div style={{ width: `${progress}%`, background: C.a, height: '100%', borderRadius: 4, transition: 'width 0.3s' }} /></div>
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
                            {[{q:0,label:'😵 Forgot',color:C.re},{q:2,label:'😕 Hard',color:'#f97316'},{q:3,label:'🙂 OK',color:C.bl},{q:4,label:'😊 Good',color:C.gr},{q:5,label:'🤩 Easy',color:C.pu}].map(r => (
                                <button key={r.q} onClick={() => rate(r.q)} style={{ background: r.color+'22', border: `1px solid ${r.color}44`, borderRadius: 8, padding: '10px 4px', cursor: 'pointer', color: r.color, fontSize: 12, fontWeight: 600 }}>{r.label}</button>
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
                <h3 style={{ color: C.tx, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Generate Flashcards</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input style={inp({ flex: 1 })} type="text" placeholder="Enter a topic to generate cards..." value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generateCards()} />
                    <button onClick={generateCards} disabled={generating || !topic.trim()} style={btn('p')}>{generating ? '...' : 'Generate'}</button>
                </div>
            </div>
            {cards.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {courses.map(c => (<button key={c} onClick={() => setSelC(c)} style={{ background: selC===c ? C.a : C.s2, color: selC===c ? '#fff' : C.mu, border: `1px solid ${selC===c ? C.a : C.b}`, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{c}</button>))}
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
            ) : (<div style={{ textAlign: 'center', color: C.mu, padding: 32 }}>{cards.length === 0 ? 'No flashcards yet. Generate some above or upload a file!' : `No cards in "${selC}".`}</div>)}
        </div>
    );
}