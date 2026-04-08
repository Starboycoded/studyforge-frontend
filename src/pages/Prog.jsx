import React, { useEffect, useState } from 'react';
import { C, card, btn } from '../theme';
import { LS } from '../utils/storage';
import { apiFetch } from '../utils/ai';
export default function Prog({ showToast }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quizHistory, setQuizHistory] = useState(() => LS.get('sf_quiz_history', []));
    useEffect(() => { loadStats(); }, []);
    async function loadStats() {
        setLoading(true);
        try { const data = await apiFetch('/api/progress'); setStats(data); }
        catch {
            const cards = LS.get('sf_cards', []);
            setStats({ totalCards: cards.length, dueCards: cards.filter(c => !c.due || new Date(c.due) <= new Date()).length, masteredCards: cards.filter(c => c.reps >= 3 && c.ef >= 2.5).length, streak: LS.get('sf_streak', 0) });
        } finally { setLoading(false); }
    }
    const cards = LS.get('sf_cards', []);
    const totalCards = stats?.totalCards ?? cards.length;
    const masteredCards = stats?.masteredCards ?? cards.filter(c => c.reps >= 3).length;
    const masteryPct = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;
    const avgQuizScore = quizHistory.length > 0 ? Math.round(quizHistory.reduce((sum, q) => sum + (q.score/q.total)*100, 0) / quizHistory.length) : 0;
    function clearHistory() { LS.set('sf_quiz_history', []); setQuizHistory([]); showToast('Quiz history cleared.'); }
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ color: C.tx, fontSize: 20, fontWeight: 700 }}>📊 Progress</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                {[
                    { label: 'Total Cards', value: loading ? '...' : totalCards, icon: '🃏', color: C.a },
                    { label: 'Mastered', value: loading ? '...' : masteredCards, icon: '✅', color: C.gr },
                    { label: 'Day Streak', value: loading ? '...' : (stats?.streak ?? 0), icon: '🔥', color: C.pu },
                    { label: 'Avg Quiz', value: loading ? '...' : `${avgQuizScore}%`, icon: '❓', color: C.bl },
                ].map(s => (<div key={s.label} style={{ ...card(), textAlign: 'center' }}><div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div><div style={{ color: s.color, fontSize: 24, fontWeight: 700 }}>{s.value}</div><div style={{ color: C.mu, fontSize: 12, marginTop: 2 }}>{s.label}</div></div>))}
            </div>
            {totalCards > 0 && (
                <div style={card()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><h3 style={{ color: C.tx, fontSize: 15, fontWeight: 700 }}>Card Mastery</h3><span style={{ color: C.gr, fontWeight: 700 }}>{masteryPct}%</span></div>
                    <div style={{ background: C.s2, borderRadius: 6, height: 10, overflow: 'hidden' }}><div style={{ width: `${masteryPct}%`, height: '100%', background: `linear-gradient(to right, ${C.a}, ${C.gr})`, borderRadius: 6, transition: 'width 0.5s ease' }} /></div>
                    <div style={{ color: C.mu, fontSize: 12, marginTop: 8 }}>{masteredCards} of {totalCards} cards mastered</div>
                </div>
            )}
            <div style={card()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h3 style={{ color: C.tx, fontSize: 15, fontWeight: 700 }}>Quiz History ({quizHistory.length})</h3>
                    {quizHistory.length > 0 && (<button onClick={clearHistory} style={btn('d', { padding: '5px 10px', fontSize: 12 })}>Clear</button>)}
                </div>
                {quizHistory.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[...quizHistory].reverse().map((q, i) => {
                            const pct = Math.round((q.score/q.total)*100);
                            return (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.s2, borderRadius: 8, padding: '10px 12px' }}><div style={{ width: 40, height: 40, borderRadius: '50%', background: pct>=70 ? C.gr+'22' : C.re+'22', border: `2px solid ${pct>=70 ? C.gr : C.re}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: pct>=70 ? C.gr : C.re, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{pct}%</div><div style={{ flex: 1 }}><div style={{ color: C.tx, fontSize: 13, fontWeight: 600 }}>{q.topic}</div><div style={{ color: C.mu, fontSize: 11 }}>{q.score}/{q.total} correct · {new Date(q.date).toLocaleDateString()}</div></div></div>);
                        })}
                    </div>
                ) : (<div style={{ textAlign: 'center', color: C.mu, padding: 24 }}>No quiz history yet. Take a quiz to see your results here!</div>)}
            </div>
        </div>
    );
}