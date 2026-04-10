import React, { useState } from 'react';
import { C, card, btn, inp } from '../theme';
import { LS } from '../utils/storage';
import { apiFetch } from '../utils/ai';


// Theory mode: AI generates open-ended questions, user types a defense, AI grades it
export default function Theory({ showToast }) {
    const [topic, setTopic] = useState('');
    const [numQ, setNumQ] = useState(3);
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});   // { qIdx: string }
    const [grades, setGrades] = useState({});     // { qIdx: gradeResult }
    const [grading, setGrading] = useState({});   // { qIdx: bool }
    const [allDone, setAllDone] = useState(false);

    const [sourceMode, setSourceMode] = useState('topic');
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [fileContext, setFileContext] = useState('');

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
            setFileContext(file.text);
        } else {
            if (!topic.trim()) return;
            content = topic.trim();
            setFileContext('');
        }

        setLoading(true);
        setAnswers({});
        setGrades({});
        setGrading({});
        setAllDone(false);

        try {
            const theoryPrompt = sourceMode === 'topic'
                ? `Generate ${numQ} open-ended theory questions about: ${content}. These should require detailed explanation and understanding, not just yes/no answers.`
                : content;

            const result = await apiFetch('/api/theory', {
                content: theoryPrompt,
                count: Number(numQ),
                topic: sourceMode === 'topic' ? content : (uploadedFiles.find(f => f.id === selectedFileId)?.name.replace(/\.[^.]+$/, '') || 'Study Material'),
            });

            const raw = Array.isArray(result) ? result : (result.questions || []);
            if (!raw.length) throw new Error('No questions returned');
            setQuestions(raw.slice(0, Number(numQ)));
            showToast(`${Math.min(raw.length, Number(numQ))} theory questions generated!`);
        } catch (ex) { showToast('Error: ' + ex.message); } finally { setLoading(false); }
    }


    async function gradeAnswer(qIdx) {
        const q = questions[qIdx];
        const userAnswer = answers[qIdx] || '';
        if (!userAnswer.trim() || userAnswer.trim().length < 10) {
            showToast('Write a more detailed answer before submitting!');
            return;
        }

        setGrading(prev => ({ ...prev, [qIdx]: true }));
        try {
            const context = fileContext || (sourceMode === 'topic' ? topic : '');
            const result = await apiFetch('/api/grade', {
                question: q.question,
                answer: userAnswer,
                context: context.slice(0, 3000),
            });
            const gradeResult = result.result || result;
            setGrades(prev => ({ ...prev, [qIdx]: gradeResult }));

            const newGrades = { ...grades, [qIdx]: gradeResult };
            if (Object.keys(newGrades).length === questions.length) {
                setAllDone(true);
                const totalScore = Object.values(newGrades).reduce((sum, g) => sum + (g.score || 0), 0);
                const avgScore = Math.round(totalScore / questions.length);
                const history = LS.get('sf_quiz_history', []);
                const label = sourceMode === 'file'
                    ? (uploadedFiles.find(f => f.id === selectedFileId)?.name.replace(/\.[^.]+$/, '') || 'Theory')
                    : topic;
                history.push({ topic: `[Theory] ${label}`, score: avgScore, total: 100, date: new Date().toISOString() });
                LS.set('sf_quiz_history', history);
                showToast('All questions graded! 🎓');
            }
        } catch (ex) {
            showToast('Grading error: ' + ex.message);
        } finally {
            setGrading(prev => ({ ...prev, [qIdx]: false }));
        }
    }


    function reset() {
        setQuestions([]);
        setAnswers({});
        setGrades({});
        setGrading({});
        setAllDone(false);
        setTopic('');
        setFileContext('');
    }


    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }


    function scoreColor(score) {
        if (score >= 80) return C.gr;
        if (score >= 60) return C.bl;
        if (score >= 40) return '#f97316';
        return C.re;
    }


    function scoreEmoji(score) {
        if (score >= 90) return '🏆';
        if (score >= 75) return '🌟';
        if (score >= 60) return '👍';
        if (score >= 40) return '📚';
        return '💪';
    }


    const canGenerate = sourceMode === 'topic' ? topic.trim().length > 0 : !!selectedFileId;
    const gradedCount = Object.keys(grades).length;
    const avgScore = gradedCount > 0
        ? Math.round(Object.values(grades).reduce((s, g) => s + (g.score || 0), 0) / gradedCount)
        : null;


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ color: C.tx, fontSize: 20, fontWeight: 700 }}>🎓 Theory Defense</h2>
            <p style={{ color: C.mu, fontSize: 13, marginTop: -12 }}>Answer open-ended questions in your own words. AI grades your defense and gives detailed feedback.</p>


            {!questions.length && (
                <div style={card()}>
                    <h3 style={{ color: C.tx, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Generate Theory Questions</h3>

                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                        <button onClick={() => setSourceMode('topic')} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: sourceMode === 'topic' ? C.a : C.s2, color: sourceMode === 'topic' ? '#fff' : C.mu, border: `1px solid ${sourceMode === 'topic' ? C.a : C.b}` }}>✏️ From Topic</button>
                        <button onClick={() => setSourceMode('file')} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: sourceMode === 'file' ? C.a : C.s2, color: sourceMode === 'file' ? '#fff' : C.mu, border: `1px solid ${sourceMode === 'file' ? C.a : C.b}` }}>📁 From My Files</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {sourceMode === 'topic' && (
                            <div>
                                <label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Topic</label>
                                <input style={inp()} type="text" placeholder="e.g. The French Revolution, Photosynthesis, OOP in Python..." value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()} />
                            </div>
                        )}

                        {sourceMode === 'file' && (
                            <div>
                                <label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>Select a file:</label>
                                {uploadedFiles.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: C.mu, padding: '16px 0', fontSize: 13 }}>No files uploaded yet. Go to the 📁 Files tab to upload your study material.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {uploadedFiles.map(f => {
                                            const hasText = f.text && f.text.trim().length > 10;
                                            return (
                                                <div key={f.id} onClick={() => hasText && setSelectedFileId(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: selectedFileId === f.id ? C.aD : C.s2, border: `1px solid ${selectedFileId === f.id ? C.a : C.b}`, borderRadius: 8, padding: '10px 12px', cursor: hasText ? 'pointer' : 'not-allowed', opacity: hasText ? 1 : 0.5, transition: 'all 0.15s' }}>
                                                    <span style={{ fontSize: 20 }}>{f.name.endsWith('.pdf') ? '📄' : f.name.match(/\.docx?$/i) ? '📝' : '📃'}</span>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ color: C.tx, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                                                        <div style={{ color: hasText ? C.mu : C.re, fontSize: 11 }}>{hasText ? formatSize(f.size) : '⚠️ No text — re-upload in Files tab'}</div>
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
                            <input style={inp()} type="number" min={1} max={10} value={numQ} onChange={e => setNumQ(e.target.value)} />
                        </div>

                        <button onClick={generate} disabled={loading || !canGenerate} style={btn('p')}>{loading ? 'Generating...' : '🎓 Generate Theory Questions'}</button>
                    </div>
                </div>
            )}


            {allDone && avgScore !== null && (
                <div style={{ ...card({ background: avgScore >= 70 ? `linear-gradient(135deg, ${C.gr}22, ${C.bl}22)` : `linear-gradient(135deg, ${C.re}22, ${C.pu}22)`, border: `1px solid ${avgScore >= 70 ? C.gr : C.re}44`, textAlign: 'center' }) }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>{scoreEmoji(avgScore)}</div>
                    <h3 style={{ color: C.tx, fontSize: 22, fontWeight: 700 }}>Average Score: {avgScore}/100</h3>
                    <p style={{ color: C.mu, fontSize: 14, marginTop: 4 }}>
                        {avgScore >= 80 ? 'Excellent defense! You clearly understand the material.' : avgScore >= 60 ? 'Good effort! Review the feedback to strengthen your answers.' : 'Keep studying! Read the feedback carefully and try again.'}
                    </p>
                    <button onClick={reset} style={{ ...btn('p', { marginTop: 16 }) }}>New Session</button>
                </div>
            )}


            {questions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {questions.map((q, i) => {
                        const grade = grades[i];
                        const isGrading = grading[i];
                        const userAnswer = answers[i] || '';
                        const wordCount = userAnswer.trim().split(/\s+/).filter(Boolean).length;

                        return (
                            <div key={i} style={card()}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                                    <div style={{ color: C.mu, fontSize: 12, fontWeight: 600 }}>Question {i + 1} of {questions.length}</div>
                                    {grade && (
                                        <div style={{ background: scoreColor(grade.score) + '22', border: `1px solid ${scoreColor(grade.score)}44`, borderRadius: 20, padding: '2px 12px', color: scoreColor(grade.score), fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                            {scoreEmoji(grade.score)} {grade.score}/100 · {grade.grade}
                                        </div>
                                    )}
                                </div>

                                <div style={{ color: C.tx, fontSize: 15, fontWeight: 600, marginBottom: 16, lineHeight: 1.6 }}>{q.question}</div>

                                {!grade && (
                                    <>
                                        <textarea
                                            value={userAnswer}
                                            onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                                            placeholder="Type your answer here. Explain your reasoning, give examples, and defend your position..."
                                            rows={5}
                                            style={{
                                                width: '100%', boxSizing: 'border-box',
                                                background: C.s2, border: `1px solid ${C.b}`,
                                                borderRadius: 8, padding: '12px', color: C.tx,
                                                fontSize: 13, lineHeight: 1.6, resize: 'vertical',
                                                fontFamily: 'inherit', outline: 'none',
                                            }}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                                            <span style={{ color: C.mu, fontSize: 11 }}>{wordCount} word{wordCount !== 1 ? 's' : ''} · Aim for at least 30 words</span>
                                            <button
                                                onClick={() => gradeAnswer(i)}
                                                disabled={isGrading || wordCount < 5}
                                                style={btn('p', { padding: '8px 20px', opacity: wordCount < 5 ? 0.5 : 1 })}
                                            >
                                                {isGrading ? '⏳ Grading...' : '✅ Submit Answer'}
                                            </button>
                                        </div>
                                    </>
                                )}

                                {grade && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div style={{ background: C.s2, borderRadius: 8, padding: '10px 12px', border: `1px solid ${C.b}` }}>
                                            <div style={{ color: C.mu, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>YOUR ANSWER</div>
                                            <div style={{ color: C.tx, fontSize: 13, lineHeight: 1.6 }}>{userAnswer}</div>
                                        </div>

                                        <div style={{ background: C.bl + '12', border: `1px solid ${C.bl}33`, borderRadius: 8, padding: '12px' }}>
                                            <div style={{ color: C.bl, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>💬 FEEDBACK</div>
                                            <div style={{ color: C.tx, fontSize: 13, lineHeight: 1.6 }}>{grade.feedback}</div>
                                        </div>

                                        {grade.strengths?.length > 0 && (
                                            <div style={{ background: C.gr + '12', border: `1px solid ${C.gr}33`, borderRadius: 8, padding: '12px' }}>
                                                <div style={{ color: C.gr, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>✅ STRENGTHS</div>
                                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                                    {grade.strengths.map((s, j) => <li key={j} style={{ color: C.tx, fontSize: 13, lineHeight: 1.6 }}>{s}</li>)}
                                                </ul>
                                            </div>
                                        )}

                                        {grade.improvements?.length > 0 && (
                                            <div style={{ background: '#f9731612', border: `1px solid #f9731633`, borderRadius: 8, padding: '12px' }}>
                                                <div style={{ color: '#f97316', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📈 IMPROVEMENTS</div>
                                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                                    {grade.improvements.map((s, j) => <li key={j} style={{ color: C.tx, fontSize: 13, lineHeight: 1.6 }}>{s}</li>)}
                                                </ul>
                                            </div>
                                        )}

                                        {grade.modelAnswer && (
                                            <details style={{ background: C.pu + '12', border: `1px solid ${C.pu}33`, borderRadius: 8, padding: '12px' }}>
                                                <summary style={{ color: C.pu, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🔍 VIEW MODEL ANSWER</summary>
                                                <div style={{ color: C.tx, fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>{grade.modelAnswer}</div>
                                            </details>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {!allDone && (
                        <div style={{ ...card({ padding: '12px 16px' }), display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ color: C.mu, fontSize: 13 }}>{gradedCount}/{questions.length} graded</span>
                            <div style={{ flex: 1, background: C.s2, borderRadius: 4, height: 6 }}>
                                <div style={{ width: `${(gradedCount / questions.length) * 100}%`, background: C.a, height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
                            </div>
                            {avgScore !== null && <span style={{ color: scoreColor(avgScore), fontSize: 13, fontWeight: 700 }}>Avg: {avgScore}/100</span>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}