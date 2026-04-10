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


    // Returns true if this file type needs server-side extraction
    function needsServerExtraction(file) {
        return (
            file.type === 'application/pdf' ||
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/msword' ||
            file.name.match(/\.(pdf|docx|doc)$/i)
        );
    }


    async function handleFiles(fileList) {
        const newFiles = [];
        for (const file of Array.from(fileList)) {
            let text = '';
            // Only read plain text files directly in the browser
            // PDF, DOCX, DOC must go to the backend extractor
            if ((file.type === 'text/plain' || file.name.match(/\.(txt|md)$/i)) && !needsServerExtraction(file)) {
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
                needsExtraction: needsServerExtraction(file),
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
                    if (!contentType.includes('application/json')) throw new Error('Server error — backend may be waking up, try again in 30s');
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

    function fileIcon(name) {
        if (name.match(/\.pdf$/i)) return '📄';
        if (name.match(/\.docx?$/i)) return '📝';
        if (name.match(/\.md$/i)) return '📝';
        return '📃';
    }


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ color: C.tx, fontSize: 20, fontWeight: 700 }}>📁 Study Files</h2>

            <div style={{ ...card({ border: `2px dashed ${dragOver ? C.a : C.b}`, background: dragOver ? C.aD : C.s, textAlign: 'center', padding: 32, cursor: 'pointer', transition: 'all 0.2s' }) }} onClick={() => fileRef.current?.click()} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                <p style={{ color: C.tx, fontWeight: 600, marginBottom: 4 }}>Drop files here or click to upload</p>
                <p style={{ color: C.mu, fontSize: 13 }}>PDF, DOCX, TXT and MD supported · Text extracted automatically</p>
                <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.doc,.txt,.md" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
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
                                onChange={e => setPlanDays(Number(e.target.value))}
                            />
                        </div>
                    </div>
                    {files.map(file => (
                        <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.b}` }}>
                            <span style={{ fontSize: 22 }}>{fileIcon(file.name)}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: C.tx, fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                                <div style={{ color: C.mu, fontSize: 12 }}>{formatSize(file.size)} · {file.text && file.text.trim().length > 10 ? `${file.text.trim().split(/\s+/).length} words` : '⚠️ No text — re-upload to extract'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                <button onClick={() => generateCardsFromFile(file)} disabled={loading || !file.text || file.text.trim().length < 10} style={{ ...btn('s'), fontSize: 12, padding: '4px 10px', opacity: (!file.text || file.text.trim().length < 10) ? 0.4 : 1 }}>🃏 Cards</button>
                                <button onClick={() => generatePlanFromFile(file)} disabled={loading || !file.text || file.text.trim().length < 10} style={{ ...btn('s'), fontSize: 12, padding: '4px 10px', opacity: (!file.text || file.text.trim().length < 10) ? 0.4 : 1 }}>📅 Plan</button>
                                <button onClick={() => removeFile(file.id)} style={{ ...btn('d'), fontSize: 12, padding: '4px 10px' }}>🗑</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}