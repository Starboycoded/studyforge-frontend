import React, { useState, useRef } from 'react';
import { C, card, btn, inp } from '../theme';
import { processImage } from '../utils/images';
const AVATARS = ['🧑‍💻', '👩‍🎓', '🧑‍🔬', '👨‍🏫', '🦊', '🐼', '🦁', '🐸', '🌟', '🔥', '💎', '🚀'];
export default function ProfileModal({ profile, onSave, onClose }) {
    const [name, setName] = useState(profile?.name || '');
    const [avatar, setAvatar] = useState(profile?.avatar || AVATARS[0]);
    const [saving, setSaving] = useState(false);
    const fileRef = useRef();
    async function handleFile(e) {
        const file = e.target.files?.[0]; if (!file) return;
        try { const dataUrl = await processImage(file, 200, 200); setAvatar(dataUrl); } catch {}
    }
    async function save() {
        if (!name.trim()) return; setSaving(true);
        try { await onSave({ name: name.trim(), avatar }); } finally { setSaving(false); }
    }
    return (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ ...card(), maxWidth: 420, width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ color: C.tx, fontSize: 18, fontWeight: 700 }}>Edit Profile</h2>
                    <button onClick={onClose} style={{ ...btn('', { padding: '6px 10px', fontSize: 16 }) }}>✕</button>
                </div>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: C.s2, border: `2px solid ${C.b}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: avatar?.startsWith('data:') ? 0 : 40, overflow: 'hidden', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                        {avatar?.startsWith('data:') ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : avatar}
                    </div>
                    <div style={{ marginTop: 8 }}><button onClick={() => fileRef.current?.click()} style={{ ...btn('', { padding: '6px 12px', fontSize: 12 }) }}>Upload Photo</button><input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} /></div>
                </div>
                <div style={{ marginBottom: 16 }}>
                    <p style={{ color: C.mu, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Or choose an emoji</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {AVATARS.map(a => (<button key={a} onClick={() => setAvatar(a)} style={{ width: 40, height: 40, borderRadius: 8, fontSize: 20, border: `2px solid ${avatar === a ? C.a : C.b}`, background: avatar === a ? C.aD : C.s2, cursor: 'pointer' }}>{a}</button>))}
                    </div>
                </div>
                <div style={{ marginBottom: 20 }}><label style={{ color: C.mu, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Display Name</label><input style={inp()} type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} /></div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={onClose} style={{ ...btn('', { flex: 1 }) }}>Cancel</button>
                    <button onClick={save} disabled={saving || !name.trim()} style={{ ...btn('p', { flex: 1 }) }}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
            </div>
        </div>
    );
}