import React, { useEffect, useState } from 'react';
import { C, card, btn } from '../theme';
import { LS } from '../utils/storage';
import { apiFetch } from '../utils/ai';

export default function Dash({ user, profile, showToast, onTabChange }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadStats(); }, []);

    async function loadStats() {
        setLoading(true);
        try {
            const data = await apiFetch('/api/stats');
            const localCards = LS.get('sf_cards', []);
            const now = new Date();
            setStats({
                totalCards: localCards.length,
                dueCards: localCards.filter(c => !c.due || new Date(c.due) <= now).length,
                totalSessions: data?.stats?.totalSessions ?? 0,
                completedDays: data?.stats?.completedStudyDays ?? 0,
                streak: LS.get('sf_streak', 0),
            });
        } catch {
            const cards = LS.get('sf_cards', []);
            const now = new Date();
            setStats({
                totalCards: cards.length,
                dueCards: cards.filter(c => !c.due || new Date(c.due) <= now).length,
                totalSessions: LS.get('sf_sessions', []).length,
                completedDays: 0,
                streak: LS.get('sf_streak', 0),
            });
        } finally { setLoading(false); }
    }

    const displayName = profile?.name || user?.name || 'Student';
    const displayAvatar = (typeof profile?.avatar === 'string' && profile.avatar) ? profile.avatar : '🧑‍💻';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const velocityHeights = [40, 65, 30, 80, 55, 70, 90];
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    const quickActions = [
        { icon: '📁', label: 'Upload Files', tab: 'files' },
        { icon: '📅', label: 'Study Plan', tab: 'plan' },
        { icon: '🃏', label: 'Flashcards', tab: 'cards' },
        { icon: '❓', label: 'Take Quiz', tab: 'quiz' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ ...card({ background: `linear-gradient(135deg, ${C.a}22, ${C.pu}22)`, border: `1px solid ${C.a}33` }), display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.aD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: displayAvatar.startsWith('data:') ? 0 : 32, overflow: 'hidden', flexShrink: 0 }}>
                    {displayAvatar.startsWith('data:') ? <img src={displayAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : displayAvatar}
                </div>
                <div>
                    <h2 style={{ color: C.tx, fontSize: 20, fontWeight: 700 }}>{greeting}, {displayName}! 👋</h2>
                    <p style={{ color: C.mu, fontSize: 13, marginTop: 4 }}>Ready to forge your knowledge today?</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                {[
                    { label: 'Flashcards', value: loading ? '...' : (stats?.totalCards ?? 0), icon: '🃏', color: C.a },
                    { label: 'Due Today', value: loading ? '...' : (stats?.dueCards ?? 0), icon: '⏰', color: C.re },
                    { label: 'Sessions', value: loading ? '...' : (stats?.totalSessions ?? 0), icon: '📖', color: C.gr },
                    { label: 'Days Done', value: loading ? '...' : (stats?.completedDays ?? 0), icon: '🔥', color: C.pu },
                ].map(s => (
                    <div key={s.label} style={{ ...card(), textAlign: 'center' }}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                        <div style={{ color: s.color, fontSize: 24, fontWeight: 700 }}>{s.value}</div>
                        <div style={{ color: C.mu, fontSize: 12, marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={card()}>
                <h3 style={{ color: C.tx, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Quick Actions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                    {quickActions.map(a => (
                        <button key={a.tab} onClick={() => onTabChange(a.tab)} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 10, padding: '14px 8px', cursor: 'pointer', textAlign: 'center' }}>
                            <div style={{ fontSize: 24, marginBottom: 6 }}>{a.icon}</div>
                            <div style={{ color: C.tx, fontSize: 12, fontWeight: 600 }}>{a.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div style={card()}>
                <h3 style={{ color: C.tx, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Study Velocity (Last 7 Days)</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
                    {velocityHeights.map((h, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: '100%', height: h, background: `linear-gradient(to top, ${C.a}, ${C.pu})`, borderRadius: '4px 4px 0 0', opacity: 0.8 }} />
                            <span style={{ color: C.mu, fontSize: 11 }}>{days[i]}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ ...card({ background: `linear-gradient(135deg, ${C.gr}15, ${C.bl}15)`, border: `1px solid ${C.gr}33` }) }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ color: C.tx, fontSize: 15, fontWeight: 700 }}>📖 Today's Reading Goal</h3>
                        <p style={{ color: C.mu, fontSize: 13, marginTop: 4 }}>
                            {stats?.dueCards > 0
                                ? `You have ${stats.dueCards} flashcard${stats.dueCards !== 1 ? 's' : ''} due for review.`
                                : 'All caught up! Upload new material to keep learning.'}
                        </p>
                    </div>
                    <button onClick={() => onTabChange(stats?.dueCards > 0 ? 'cards' : 'files')} style={btn('p', { flexShrink: 0 })}>
                        {stats?.dueCards > 0 ? 'Review Now' : 'Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
}
