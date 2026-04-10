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


    const [sourceMode, setSourceMode] = useState('topic');
    const [selectedFileId, setSelectedFileId] = useState(null);


    const uploadedFiles = LS.get('sf_files', []);


    async function generate() {
        let content = '';


        if (sourceMode === 'file') {
            if (!selectedFileId) { showToast('Please select a file first!'); return; }
            const file = uploadedFiles.find(f => f.id === selectedFileId);
            if (!file) { showToast('File not found. Please re-upload it.'); return; }
            if (!file.text || file.text.trim().length < 10) {
                showToast('⚠️ No text extracted from this file. Remove it and re-upload.');
                return;
            }
            content = file.text;
        } else {
            if (!topic.trim()) return;
            content = topic.trim();
        }


        setLoading(true); setAnswers({}); setSubmitted(false); setScore(null);
        try {
            const result = await apiFetch('/api/quiz', { content, count: Number(numQ) });
            const raw = Array.isArray(result) ? result : (result.questions || result.quiz || result.data || []);
            if (!raw.length) throw new Error('No questions returned');
            // Enforce exact count — backend may return more due to chunking
            const trimmed = raw.slice(0, Number(numQ));
            setQuestions(trimmed);
            showToast(`${trimmed.length} questions generated!`);
        } catch (ex) { showToast('Error: ' + ex.message); } finally { setLoading(false); }
    }


    function selectAnswer(qIdx, optionIdx) {
        if (submitted) return;
        setAnswers(prev => ({ ...prev, [qIdx]: optionIdx }));
    }


    function submit() {
        if (Object.keys(answers).length < questions.length) { showToast('Please answer all questions first!'); return; }
        let correct = 0;
        questions.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
        setScore(correct); setSubmitted(true);
        const history = LS.get('sf_quiz_history', []);
        const label = sourceMode === 'file'
            ? (uploadedFiles.find(f => f.id === selectedFileId)?.name.replace(/\.[^.]+$/, '') || 'File Quiz')
            : topic;
        history.push({ topic: label, score: correct, total: questions.length, date: new Date().toISOString() });
        LS.set('sf_quiz_history', history);
    }


    function reset() { setQuestions([]); setAnswers({}); setSubmitted(false); setScore(null); setTopic(''); }


    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }


    const canGenerate = sourceMode === 'topic' ? topic.trim().length > 0 : !!selectedFileId;


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ color: C.tx, fontSize: 20, fontWeight: 700 }}>❓ Quiz</h2>


            {!questions.length && (
                <div style={card()}>
                    <h3 style={{ color: C.tx, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Generate a Quiz</h3>


                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                        <button onClick={() => setSourceMode('topic')} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: sourceMode === 'topic' ? C.a : C.s2, color: sourceMode === 'topic' ? '#fff' : C.mu, border: `1px solid ${sourceMode === 'topic' ? C.a : C.b}` }}>✏️ From Topic</button>
                        <button onClick={() => setSourceMode('file')} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: sourceMode === 'file' ? C.a : C.s2, color: sourceMode === 'file' ? '#fff' : C.mu, border: `1px solid ${sourceMode === 'file' ? C.a : C.b}` }}>📁 From My Files</button>
                    </div>


                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {sourceMode === 'topic' && (
                            <div>
                                <label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Topic</label>
                                <input style={inp()} type="text" placeholder="e.g. Photosynthesis, World War II, Python..." value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()} />
                            </div>
                        )}


                        {sourceMode === 'file' && (
                            <div>
                                <label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>Select a file to quiz on:</label>
                                {uploadedFiles.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: C.mu, padding: '16px 0', fontSize: 13 }}>No files uploaded yet. Go to the 📁 Files tab to upload your study material.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {uploadedFiles.map(f => {
                                            const hasText = f.text && f.text.trim().length > 10;
                                            return (
                                                <div key={f.id} onClick={() => hasText && setSelectedFileId(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: selectedFileId === f.id ? C.aD : C.s2, border: `1px solid ${selectedFileId === f.id ? C.a : C.b}`, borderRadius: 8, padding: '10px 12px', cursor: hasText ? 'pointer' : 'not-allowed', opacity: hasText ? 1 : 0.5, transition: 'all 0.15s' }}>
                                                    <span style={{ fontSize: 20 }}>{f.name.endsWith('.pdf') ? '📄' : f.name.match(/\.docx?$/i) ? '📝' : f.name.endsWith('.md') ? '📝' : '📃'}</span>
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
                                )}
                            </div>
                        )}


                        <div>
                            <label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Number of Questions</label>
                            <input style={inp()} type="number" min={1} max={20} value={numQ} onChange={e => setNumQ(e.target.value)} />
                        </div>


                        <button onClick={generate} disabled={loading || !canGenerate} style={btn('p')}>{loading ? 'Generating...' : '✨ Generate Quiz'}</button>
                    </div>
                </div>
            )}


            {submitted && score !== null && (
                <div style={{ ...card({ background: score / questions.length >= 0.7 ? `linear-gradient(135deg, ${C.gr}22, ${C.bl}22)` : `linear-gradient(135deg, ${C.re}22, ${C.pu}22)`, border: `1px solid ${score / questions.length >= 0.7 ? C.gr : C.re}44`, textAlign: 'center' }) }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>{score / questions.length >= 0.8 ? '🏆' : score / questions.length >= 0.6 ? '👍' : '📚'}</div>
                    <h3 style={{ color: C.tx, fontSize: 22, fontWeight: 700 }}>{score} / {questions.length}</h3>
                    <p style={{ color: C.mu, fontSize: 14, marginTop: 4 }}>{Math.round((score / questions.length) * 100)}% correct{score / questions.length >= 0.8 ? ' — Excellent!' : score / questions.length >= 0.6 ? ' — Good job!' : ' — Keep studying!'}</p>
                    <button onClick={reset} style={{ ...btn('p', { marginTop: 16 }) }}>New Quiz</button>
                </div>
            )}


            {questions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {questions.map((q, i) => {
                        const selectedIdx = answers[i];
                        const correctIdx = q.correct;
                        const isCorrect = selectedIdx === correctIdx;
                        return (
                            <div key={i} style={card()}>
                                <div style={{ color: C.mu, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Question {i + 1} of {questions.length}</div>
                                <div style={{ color: C.tx, fontSize: 15, fontWeight: 600, marginBottom: 14, lineHeight: 1.5 }}>{q.question}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {(q.options || []).map((opt, j) => {
                                        let bg = C.s2, border = C.b, color = C.tx;
                                        if (submitted) {
                                            if (j === correctIdx) { bg = C.gr + '22'; border = C.gr; color = C.gr; }
                                            else if (j === selectedIdx && !isCorrect) { bg = C.re + '22'; border = C.re; color = C.re; }
                                        } else if (j === selectedIdx) { bg = C.aD; border = C.a; color = C.a; }
                                        return (<button key={j} onClick={() => selectAnswer(i, j)} disabled={submitted} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '10px 14px', textAlign: 'left', cursor: submitted ? 'default' : 'pointer', color, fontSize: 13, fontWeight: j === selectedIdx ? 600 : 400, transition: 'all 0.15s' }}>{opt}</button>);
                                    })}
                                </div>
                                {submitted && q.explanation && (<div style={{ marginTop: 12, background: C.bl + '15', border: `1px solid ${C.bl}33`, borderRadius: 8, padding: '10px 12px', color: C.bl, fontSize: 12 }}>💡 {q.explanation}</div>)}
                            </div>
                        );
                    })}
                    {!submitted && (<button onClick={submit} disabled={Object.keys(answers).length < questions.length} style={btn('p', { padding: '14px', fontSize: 15 })}>Submit Quiz ({Object.keys(answers).length}/{questions.length} answered)</button>)}
                </div>
            )}
        </div>
    );
}