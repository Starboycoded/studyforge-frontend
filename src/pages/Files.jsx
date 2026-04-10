import React, { useState, useRef } from 'react';
import { C, card, btn, inp } from '../theme';
import { LS } from '../utils/storage';
import { apiFetch } from '../utils/ai';


export default function Files({ showToast }) {
    const [files, setFiles] = useState(() => LS.get('sf_files', []));
    const [ytUrl, setYtUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingYt, setLoadingYt] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [planDays, setPlanDays] = useState(7);
    const fileRef = useRef();


    function saveFiles(updated) { setFiles(updated); LS.set('sf_files', updated); }


    async function handleFiles(fileList) {
        const newFiles = [];
        for (const file of Array.from(fileList)) {
            let text = '';
            if (file.type === 'text/plain' || file.name.match(/\.(txt|md)$/i)) {
                text = await new Promise(res => {
                    const reader = new FileReader();
                    reader.onload = e => res(e.target.result || '');
                    reader.readAsText(file);
                });
            }
            newFiles.push({
                id: 'f' + Date.now() + Math.random(),
                name: file.name,
                size: file.size,
                type: file.type,
                text: text || '',
                needsExtraction: (file.type === 'application/pdf' || file.name.match(/\.pdf$/i)) ? true : false,
                _rawFile: file,
                addedAt: new Date().toISOString(),
            });
        }

        const updatedFiles = [...files];
        for (const f of newFiles) {
            if (f.needsExtraction && f._rawFile) {
                showToast(`Extracting text from ${f.name}...`);
                try {
                    const formData = new FormData();
                    formData.append('file', f._rawFile);
                    const token = localStorage.getItem('token');
                    const BASE = import.meta.env.VITE_API_URL || 'https://study-forge-usyo.onrender.com';
                    const r = await fetch(`${BASE}/api/extract`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData,
                    });
                    const contentType = r.headers.get('content-type') || '';
                    if (!contentType.includes('application/json')) throw new Error('Server error — backend may be waking up');
                    const data = await r.json();
                    if (!r.ok) throw new Error(data.error || 'Extraction failed');
                    f.text = data.text || '';
                    f.needsExtraction = false;
                    showToast(`✅ ${f.name} ready — ${data.wordCount} words extracted`);
                } catch (err) {
                    showToast(`⚠️ Could not extract ${f.name}: ${err.message}`);
                    f.needsExtraction = true;
                }
            }
            const { _rawFile, ...storable } = f;
            updatedFiles.push(storable);
        }
        saveFiles(updatedFiles);
    }


    function removeFile(id) { saveFiles(files.filter(f => f.id !== id)); }


    async function generateFromYoutube() {
        if (!ytUrl.trim()) return;
        setLoadingYt(true);
        try {
            const result = await apiFetch('/api/youtube', { url: ytUrl.trim(), count: 10 });
            const cards = Array.isArray(result) ? result : (result.flashcards || result.cards || []);
            if (!cards.length) throw new Error('No flashcards returned');
            const existing = LS.get('sf_cards', []);
            const newCards = cards.map((c, i) => ({ id: 'c' + Date.now() + i, q: c.front || c.q || c.question || '', a: c.back || c.a || c.answer || '', course: c.topic || 'YouTube', ef: 2.5, reps: 0, interval: 1, due: null }));
            LS.set('sf_cards', [...existing, ...newCards]);
            showToast(`${newCards.length} flashcards generated from YouTube!`);
            setYtUrl('');
        } catch (ex) { showToast('Error: ' + ex.message); } finally { setLoadingYt(false); }
    }


    async function generateCardsFromFile(file) {
        if (!file.text || file.text.trim().length < 10) { showToast('No text extracted from this file yet. Remove and re-upload it.'); return; }
        setLoading(true);
        try {
            const result = await apiFetch('/api/flashcards', { content: file.text, count: 10 });
            const cards = Array.isArray(result) ? result : (result.flashcards || result.cards || []);
            if (!cards.length) throw new Error('No flashcards returned');
            const existing = LS.get('sf_cards', []);
            const newCards = cards.map((c, i) => ({ id: 'c' + Date.now() + i, q: c.front || c.q || c.question || '', a: c.back || c.a || c.answer || '', course: c.topic || file.name.replace(/\.[^.]+$/, ''), ef: 2.5, reps: 0, interval: 1, due: null }));
            LS.set('sf_cards', [...existing, ...newCards]);
            showToast(`${newCards.length} flashcards generated from ${file.name}!`);
        } catch (ex) { showToast('Error: ' + ex.message); } finally { setLoading(false); }
    }


    async function generatePlanFromFile(file) {
        if (!file.text || file.text.trim().length < 10) { showToast('No text extracted from this file yet. Remove and re-upload it.'); return; }
        setLoading(true);
        try {
            const result = await apiFetch('/api/plan', {
                content: file.text,
                subject: file.name.replace(/\.[^.]+$/, ''),
                hoursPerDay: 2,
                days: Number(planDays),
                examDate: `${Number(planDays)} days from now`,
            });
            let raw = [];
            if (Array.isArray(result)) { raw = result; }
            else if (result?.plan) {
                const planObj = result.plan;
                if (Array.isArray(planObj)) { raw = planObj; }
                else if (planObj && typeof planObj === 'object') { raw = Array.isArray(planObj.plan) ? planObj.plan : (Object.values(planObj).find(v => Array.isArray(v)) || []); }
            }
            if (!raw.length) throw new Error('No plan returned from server');
            LS.set('sf_plan', raw);
            showToast(`${raw.length}-day study plan generated from ${file.name}! Go to Plan tab to view it.`);
        } catch (ex) { showToast('Error: ' + ex.message); } finally { setLoading(false); }
    }


    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ color: C.tx, fontSize: 20, fontWeight: 700 }}>📁 Study Files</h2>

            <div style={{ ...card({ border: `2px dashed ${dragOver ? C.a : C.b}`, background: dragOver ? C.aD : C.s, textAlign: 'center', padding: 32, cursor: 'pointer', transition: 'all 0.2s' }) }} onClick={() => fileRef.current?.click()} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                <p style={{ color: C.tx, fontWeight: 600, marginBottom: 4 }}>Drop files here or click to upload</p>
                <p style={{ color: C.mu, fontSize: 13 }}>PDF text is extracted automatically · TXT and MD supported</p>
                <input ref={fileRef} type="file" multiple accept=".pdf,.txt,.md" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
            </div>

            <div style={card()}>
                <h3 style={{ color: C.tx, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🎥 Generate from YouTube</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input style={inp({ flex: 1 })} type="url" placeholder="Paste YouTube URL..." value={ytUrl} onChange={e => setYtUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && generateFromYoutube()} />
                    <button onClick={generateFromYoutube} disabled={loadingYt || !ytUrl.trim()} style={btn('p')}>{loadingYt ? '...' : 'Generate'}</button>
                </div>
            </div>

            {files.length > 0 && (
                <div style={card()}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                        <h3 style={{ color: C.tx, fontSize: 15, fontWeight: 700 }}>Uploaded Files ({files.length})</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ color: C.mu, fontSize: 12, fontWeight: 600 }}>Plan days:</label>
                            <input
                                style={{ ...inp(), width: 60, padding: '4px 8px', fontSize: 13 }}
                                type="number" min={1} max={30} value={planDays}
                                onChange={e => setPlanDays(e.target.value)}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {files.map(f => {
                            const hasText = f.text && f.text.trim().length > 10;
                            return (
                                <div key={f.id} style={{ background: C.s2, borderRadius: 8, padding: '10px 12px', border: `1px solid ${hasText ? C.b : C.re + '44'}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ fontSize: 20 }}>{f.name.endsWith('.pdf') ? '📄' : f.name.endsWith('.md') ? '📝' : '📃'}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ color: C.tx, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                                            <div style={{ color: hasText ? C.gr : C.re, fontSize: 11 }}>
                                                {hasText ? `✅ ${f.text.trim().split(/\s+/).length} words ready` : '⚠️ No text — remove and re-upload'}
                                            </div>
                                        </div>
                                        <button onClick={() => generateCardsFromFile(f)} disabled={loading || !hasText} style={btn('p', { padding: '6px 12px', fontSize: 12, opacity: hasText ? 1 : 0.4 })} title="Generate flashcards">{loading ? '...' : '🃏 Cards'}</button>
                                        <button onClick={() => generatePlanFromFile(f)} disabled={loading || !hasText} style={btn('p', { padding: '6px 12px', fontSize: 12, background: '#6366f1', opacity: hasText ? 1 : 0.4 })} title="Generate study plan">{loading ? '...' : '📅 Plan'}</button>
                                        <button onClick={() => removeFile(f.id)} style={btn('d', { padding: '6px 10px', fontSize: 12 })}>✕</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {files.length === 0 && (<div style={{ textAlign: 'center', color: C.mu, padding: 32 }}>No files uploaded yet. Drop some study material above!</div>)}
        </div>
    );
}
