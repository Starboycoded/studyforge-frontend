import React, { useState, useEffect, useCallback } from 'react';
import { C, btn } from './theme';
import { LS } from './utils/storage';
import { apiFetch } from './utils/ai';
import Toast from './components/Toast';
import ApiKeyScreen from './components/ApiKeyScreen';
import ProfileModal from './components/ProfileModal';
import Dash from './pages/Dash';
import Files from './pages/Files';
import Plan from './pages/Plan';
import Cards from './pages/Cards';
import Quiz from './pages/Quiz';
import Theory from './pages/Theory';
import Prog from './pages/Prog';




function getSafeName(obj) {
    if (!obj) return '';
    const raw = obj.name || obj.displayName || obj.username || obj.email || '';
    if (typeof raw !== 'string') return String(raw || '');
    return raw.trim();
}




const TABS = [
    { id: 'dash', label: '🏠', title: 'Dashboard' },
    { id: 'files', label: '📁', title: 'Files' },
    { id: 'plan', label: '📅', title: 'Plan' },
    { id: 'cards', label: '🃏', title: 'Cards' },
    { id: 'quiz', label: '❓', title: 'Quiz' },
    { id: 'theory', label: '🎓', title: 'Theory' },
    { id: 'prog', label: '📊', title: 'Progress' },
];




export default function App() {
    const [user, setUser] = useState(() => LS.get('sf_user'));
    const [profile, setProfile] = useState(() => LS.get('sf_profile'));
    const [tab, setTab] = useState('dash');
    const [toast, setToast] = useState('');
    const [showProfile, setShowProfile] = useState(false);
    const [theme, setTheme] = useState(() => LS.get('sf_theme') || 'dark');




    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
        LS.set('sf_theme', theme);
    }, [theme]);




    const showToast = useCallback((msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }, []);




    function handleLogin(userData) {
        setUser(userData);
        LS.set('sf_user', userData);
        const safeName = getSafeName(userData);
        const existingProfile = LS.get('sf_profile');
        const newProfile = {
            name: safeName || existingProfile?.name || 'User',
            avatar: existingProfile?.avatar || '🧑‍💻',
        };
        setProfile(newProfile);
        LS.set('sf_profile', newProfile);
    }




    function handleLogout() {
        localStorage.removeItem('token');
        LS.set('sf_user', null);
        setUser(null);
        setProfile(null);
    }




    async function handleProfileSave(updates) {
        const newProfile = { ...profile, ...updates };
        setProfile(newProfile);
        LS.set('sf_profile', newProfile);


        if (updates.name) {
            const updatedUser = { ...user, name: updates.name };
            setUser(updatedUser);
            LS.set('sf_user', updatedUser);
        }


        // NOTE: No backend profile update endpoint — local update only.
        setShowProfile(false);
        showToast('Profile updated!');
    }




    // On mount, sync user data from backend
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !user) return;
        apiFetch('/auth/me').then(data => {
            if (data?.user) {
                const backendUser = data.user;
                const currentProfile = LS.get('sf_profile') || {};
                if (backendUser.name && !currentProfile.name) {
                    const updated = { ...currentProfile, name: backendUser.name };
                    setProfile(updated);
                    LS.set('sf_profile', updated);
                }
                setUser(prev => ({ ...prev, ...backendUser }));
                LS.set('sf_user', { ...user, ...backendUser });
            }
        }).catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps




    if (!user || !localStorage.getItem('token')) {
        return <ApiKeyScreen onLogin={handleLogin} />;
    }




    const displayName = getSafeName(profile) || getSafeName(user) || 'User';
    const displayAvatar = (typeof profile?.avatar === 'string' && profile.avatar) ? profile.avatar : '🧑‍💻';
    const pageProps = { user, profile, showToast };




    return (
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
            <Toast msg={toast} />




            <nav style={{
                background: C.s, borderBottom: `1px solid ${C.b}`,
                padding: '0 16px', display: 'flex', alignItems: 'center',
                height: 56, position: 'sticky', top: 0, zIndex: 100, gap: 8,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
                    <span style={{ fontSize: 22 }}>📚</span>
                    <span style={{ color: C.tx, fontWeight: 700, fontSize: 16 }}>StudyForge</span>
                </div>




                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} title={t.title} style={{
                            background: tab === t.id ? C.aD : 'transparent',
                            color: tab === t.id ? C.a : C.mu,
                            border: tab === t.id ? `1px solid ${C.a}33` : '1px solid transparent',
                            borderRadius: 8, padding: '6px 10px', fontSize: 18, cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                            {t.label}
                        </button>
                    ))}
                </div>




                <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle theme"
                    style={{ background: 'transparent', border: 'none', color: C.mu, fontSize: 18, cursor: 'pointer', padding: '6px 8px' }}>
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>




                <button onClick={() => setShowProfile(true)} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: C.s2, border: `1px solid ${C.b}`,
                    borderRadius: 20, padding: '4px 12px 4px 4px', cursor: 'pointer', color: C.tx,
                }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: C.aD,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: displayAvatar.startsWith('data:') ? 0 : 16, overflow: 'hidden', flexShrink: 0,
                    }}>
                        {displayAvatar.startsWith('data:')
                            ? <img src={displayAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : displayAvatar}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayName}
                    </span>
                </button>




                <button onClick={handleLogout} title="Logout"
                    style={{ background: 'transparent', border: 'none', color: C.mu, fontSize: 18, cursor: 'pointer', padding: '6px 8px' }}>
                    🚪
                </button>
            </nav>




            <main style={{ flex: 1, padding: '20px 16px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
                {tab === 'dash' && <Dash {...pageProps} onTabChange={setTab} />}
                {tab === 'files' && <Files {...pageProps} />}
                {tab === 'plan' && <Plan {...pageProps} />}
                {tab === 'cards' && <Cards {...pageProps} />}
                {tab === 'quiz' && <Quiz {...pageProps} />}
                {tab === 'theory' && <Theory {...pageProps} />}
                {tab === 'prog' && <Prog {...pageProps} />}
            </main>




            {showProfile && (
                <ProfileModal
                    profile={{ name: displayName, avatar: displayAvatar }}
                    onSave={handleProfileSave}
                    onClose={() => setShowProfile(false)}
                />
            )}
        </div>
    );
}