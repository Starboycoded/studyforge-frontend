import React, { useState } from 'react';
import { C, card, btn, inp } from '../theme';
import { LS } from '../utils/storage';
import { apiFetch } from '../utils/ai';
export default function Quiz({ showToast }) {
    const [topic, setTopic] = useState('');
    const [numQ, setNumQ] = useState(5);
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(null);
    async function generate() {
        if (!topic.trim()) return;
        setLoading(true); setAnswers({}); setSubmitted(false); setScore(null);
        try {
            const result = await apiFetch('/api/quiz', { topic: topic.trim(), numQuestions: Number(numQ) });
            const raw = Array.isArray(result) ? result : (result.questions || result.quiz || result.data || []);
            if (!raw.length) throw new Error('No questions returned');
            setQuestions(raw);
            showToast(`${raw.length} questions generated!`);
        } catch (ex) { showToast('Error: ' + ex.message); } finally { setLoading(false); }
    }
    function selectAnswer(qIdx, option) { if (submitted) return; setAnswers(prev => ({ ...prev, [qIdx]: option })); }
    function submit() {
        if (Object.keys(answers).length < questions.length) { showToast('Please answer all questions first!'); return; }
        let correct = 0;
        questions.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
        setScore(correct); setSubmitted(true);
        const history = LS.get('sf_quiz_history', []);
        history.push({ topic, score: correct, total: questions.length, date: new Date().toISOString() });
        LS.set('sf_quiz_history', history);
    }
    function reset() { setQuestions([]); setAnswers({}); setSubmitted(false); setScore(null); setTopic(''); }
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ color: C.tx, fontSize: 20, fontWeight: 700 }}>❓ Quiz</h2>
            {!questions.length && (
                <div style={card()}>
                    <h3 style={{ color: C.tx, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Generate a Quiz</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div><label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Topic</label><input style={inp()} type="text" placeholder="e.g. Photosynthesis, World War II, Python..." value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()} /></div>
                        <div><label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Number of Questions</label><input style={inp()} type="number" min={1} max={20} value={numQ} onChange={e => setNumQ(e.target.value)} /></div>
                        <button onClick={generate} disabled={loading || !topic.trim()} style={btn('p')}>{loading ? 'Generating...' : '✨ Generate Quiz'}</button>
                    </div>
                </div>
            )}
            {submitted && score !== null && (
                <div style={{ ...card({ background: score/questions.length >= 0.7 ? `linear-gradient(135deg, ${C.gr}22, ${C.bl}22)` : `linear-gradient(135deg, ${C.re}22, ${C.pu}22)`, border: `1px solid ${score/questions.length >= 0.7 ? C.gr : C.re}44`, textAlign: 'center' }) }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>{score/questions.length >= 0.8 ? '🏆' : score/questions.length >= 0.6 ? '👍' : '📚'}</div>
                    <h3 style={{ color: C.tx, fontSize: 22, fontWeight: 700 }}>{score} / {questions.length}</h3>
                    <p style={{ color: C.mu, fontSize: 14, marginTop: 4 }}>{Math.round((score/questions.length)*100)}% correct{score/questions.length >= 0.8 ? ' — Excellent!' : score/questions.length >= 0.6 ? ' — Good job!' : ' — Keep studying!'}</p>
                    <button onClick={reset} style={{ ...btn('p', { marginTop: 16 }) }}>New Quiz</button>
                </div>
            )}
            {questions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {questions.map((q, i) => {
                        const selected = answers[i];
                        const correctAnswer = q.correct;
                        const isCorrect = selected === correctAnswer;
                        return (
                            <div key={i} style={card()}>
                                <div style={{ color: C.mu, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Question {i+1} of {questions.length}</div>
                                <div style={{ color: C.tx, fontSize: 15, fontWeight: 600, marginBottom: 14, lineHeight: 1.5 }}>{q.question}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {(q.options || []).map((opt, j) => {
                                        let bg = C.s2, border = C.b, color = C.tx;
                                        if (submitted) { if (opt === correctAnswer) { bg = C.gr+'22'; border = C.gr; color = C.gr; } else if (opt === selected && !isCorrect) { bg = C.re+'22'; border = C.re; color = C.re; } } else if (opt === selected) { bg = C.aD; border = C.a; color = C.a; }
                                        return (<button key={j} onClick={() => selectAnswer(i, opt)} disabled={submitted} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '10px 14px', textAlign: 'left', cursor: submitted ? 'default' : 'pointer', color, fontSize: 13, fontWeight: opt === selected ? 600 : 400, transition: 'all 0.15s' }}>{opt}</button>);
                                    })}
                                </div>
                                {submitted && q.explanation && (<div style={{ marginTop: 12, background: C.bl+'15', border: `1px solid ${C.bl}33`, borderRadius: 8, padding: '10px 12px', color: C.bl, fontSize: 12 }}>💡 {q.explanation}</div>)}
                            </div>
                        );
                    })}
                    {!submitted && (<button onClick={submit} disabled={Object.keys(answers).length < questions.length} style={btn('p', { padding: '14px', fontSize: 15 })}>Submit Quiz ({Object.keys(answers).length}/{questions.length} answered)</button>)}
                </div>
            )}
        </div>
    );
}