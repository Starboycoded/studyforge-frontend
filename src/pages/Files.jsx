import React, { useState, useRef } from 'react';
import { C, card, btn, inp } from '../theme';
import { LS } from '../utils/storage';
import { apiFetch } from '../utils/ai';
import { readFileData } from '../utils/sm2';
export default function Files({ showToast }) {
    const [files, setFiles] = useState(() => LS.get('sf_files', []));
    const [ytUrl, setYtUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingYt, setLoadingYt] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef();
    function saveFiles(updated) { setFiles(updated); LS.set('sf_files', updated); }
    async function handleFiles(fileList) {
        const newFiles = [];
        for (const file of Array.from(fileList)) {
            const { text, b64 } = await readFileData(file);
            newFiles.push({ id: 'f' + Date.now() + Math.random(), name: file.name, size: file.size, type: file.type, text: text || '', b64: b64 || null, addedAt: new Date().toISOString() });
        }
        saveFiles([...files, ...newFiles]);
        showToast(`${newFiles.length} file${newFiles.length !== 1 ? 's' : ''} added!`);
    }
    function removeFile(id) { saveFiles(files.filter(f => f.id !== id)); }
    async function generateFromYoutube() {
        if (!ytUrl.trim()) return;
        setLoadingYt(true);
        try {
            const result = await apiFetch('/api/flashcards', { youtubeUrl: ytUrl.trim() });
            const cards = Array.isArray(result) ? result : (result.flashcards || result.cards || []);
            if (!cards.length) throw new Error('No flashcards returned');
            const existing = LS.get('sf_cards', []);
            const newCards = cards.map((c, i) => ({ id: 'c' + Date.now() + i, q: c.front || c.q || c.question || '', a: c.back || c.a || c.answer || '', course: c.topic || 'YouTube', ef: 2.5, reps: 0, interval: 1, due: null }));
            LS.set('sf_cards', [...existing, ...newCards]);
            showToast(`${newCards.length} flashcards generated from YouTube!`);
            setYtUrl('');
        } catch (ex) { showToast('Error: ' + ex.message); } finally { setLoadingYt(false); }
    }
    async function extractFromFile(file) {
        setLoading(true);
        try {
            const result = await apiFetch('/api/flashcards', file.b64 ? { b64: file.b64, filename: file.name } : { text: file.text, filename: file.name });
            const cards = Array.isArray(result) ? result : (result.flashcards || result.cards || []);
            if (!cards.length) throw new Error('No flashcards returned');
            const existing = LS.get('sf_cards', []);
            const newCards = cards.map((c, i) => ({ id: 'c' + Date.now() + i, q: c.front || c.q || c.question || '', a: c.back || c.a || c.answer || '', course: c.topic || file.name, ef: 2.5, reps: 0, interval: 1, due: null }));
            LS.set('sf_cards', [...existing, ...newCards]);
            showToast(`${newCards.length} flashcards generated from ${file.name}!`);
        } catch (ex) { showToast('Error: ' + ex.message); } finally { setLoading(false); }
    }
    function formatSize(bytes) { if (bytes < 1024) return bytes + ' B'; if (bytes < 1024*1024) return (bytes/1024).toFixed(1)+' KB'; return (bytes/(1024*1024)).toFixed(1)+' MB'; }
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ color: C.tx, fontSize: 20, fontWeight: 700 }}>📁 Study Files</h2>
            <div style={{ ...card({ border: `2px dashed ${dragOver ? C.a : C.b}`, background: dragOver ? C.aD : C.s, textAlign: 'center', padding: 32, cursor: 'pointer', transition: 'all 0.2s' }) }} onClick={() => fileRef.current?.click()} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                <p style={{ color: C.tx, fontWeight: 600, marginBottom: 4 }}>Drop files here or click to upload</p>
                <p style={{ color: C.mu, fontSize: 13 }}>Supports PDF, TXT, MD, and more</p>
                <input ref={fileRef} type="file" multiple accept=".pdf,.txt,.md,.doc,.docx" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
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
                    <h3 style={{ color: C.tx, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Uploaded Files ({files.length})</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {files.map(f => (
                            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.s2, borderRadius: 8, padding: '10px 12px' }}>
                                <span style={{ fontSize: 20 }}>{f.name.endsWith('.pdf') ? '📄' : f.name.endsWith('.md') ? '📝' : '📃'}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ color: C.tx, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                                    <div style={{ color: C.mu, fontSize: 11 }}>{formatSize(f.size)}</div>
                                </div>
                                <button onClick={() => extractFromFile(f)} disabled={loading} style={btn('p', { padding: '6px 12px', fontSize: 12 })}>{loading ? '...' : '🃏 Cards'}</button>
                                <button onClick={() => removeFile(f.id)} style={btn('d', { padding: '6px 10px', fontSize: 12 })}>✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {files.length === 0 && (<div style={{ textAlign: 'center', color: C.mu, padding: 32 }}>No files uploaded yet. Drop some study material above!</div>)}
        </div>
    );
}