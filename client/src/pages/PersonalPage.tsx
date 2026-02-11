import { useState, useEffect } from 'react';
import { Play, Settings, Zap, BarChart3, Brain, Layout, TrendingUp, HelpCircle, LogOut, Shield } from 'lucide-react';
import type { GameStyle } from '../types';
import './PersonalPage.css';

interface PersonalPageProps {
    username: string;
    gameStyle: GameStyle;
    onStyleChange: (style: GameStyle) => void;
    onStartGame: (letters: string[]) => void;
    onViewHistory?: () => void;
    onViewTutorial?: () => void;
    onLogout: () => void;
    isAdmin?: boolean;
    userProfile?: string;
    totalSessionsPlayed?: number;
    lastPlayedLetters?: string[];
}

export default function PersonalPage({
    username,
    gameStyle,
    onStyleChange,
    onStartGame,
    onViewHistory,
    onViewTutorial,
    onLogout,
    isAdmin,
    userProfile = 'Candidate',
    totalSessionsPlayed = 0,
    lastPlayedLetters = ['A', 'L']
}: PersonalPageProps) {
    const [letters, setLetters] = useState(lastPlayedLetters);

    // Update local state if prop changes (e.g. after fetch completes)
    useEffect(() => {
        if (lastPlayedLetters && lastPlayedLetters.length === 2) {
            setLetters(lastPlayedLetters);
        }
    }, [lastPlayedLetters]);

    const handleLetterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Enforce exactly 2 letters, uppercase only, alpha only
        const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
        setLetters(val.split(''));
    };

    const handleStyleClick = (style: GameStyle) => {
        console.log('Style clicked:', style);
        onStyleChange(style);
    };

    const handleAdminAccess = async (e: React.MouseEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const apiUrl = import.meta.env.PROD ? '/api' : 'http://localhost:4000/api';
            const res = await fetch(`${apiUrl}/auth/admin-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                }
            });

            if (res.ok) {
                window.open('/admin.html', '_blank');
            } else {
                alert('Admin access denied.');
            }
        } catch (err) {
            console.error('Failed to initialize admin session', err);
            alert('Error initializing admin session');
        }
    };

    // Recommendations from Tutorial (How to Play)
    const RECOMMENDATIONS = [
        "Take a comfortable position.",
        "Play in a calm environment with minimal distractions.",
        "Look at the center of the screen. During the game, try to keep your gaze on the center.",
        "Pay attention to your breathing. Breathe in a relaxed manner.",
        "Don't dwell on mistakes — keep playing.",
        "Eliminate the moment of anticipation (don't guess); simply react to the appearing symbol (event).",
        "If during the game you feel overloaded and unable to cope, stop playing. Take a break for 1-2 days.",
        "It is recommended that the player periodically (every 2 weeks) change the letters (symbols) — one of the two or both at once."
    ];

    const currentRecIndex = (totalSessionsPlayed || 0) % RECOMMENDATIONS.length;
    const currentRecommendation = RECOMMENDATIONS[currentRecIndex];

    return (
        <div className="personal-page dashboard-layout">
            <header className="dashboard-header">
                <div className="header-left">
                    <div className="avatar-circle">{username.substring(0, 2).toUpperCase()}</div>
                    <div>
                        <h1>{username}</h1>
                        <p className="level-badge">Level 1 • {userProfile} {isAdmin && <span style={{ color: '#ff4444', marginLeft: '5px' }}>• ADMIN</span>}</p>
                    </div>
                </div>
                <div className="header-stats">
                    <button className="logout-btn" onClick={onLogout} title="Logout">
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                    <div className="stat-item">
                        <Zap size={16} />
                        <span>Streak: 3 Days</span>
                    </div>
                    <div className="stat-item">
                        <BarChart3 size={16} />
                        <span>High Score: 12,450</span>
                    </div>
                </div>
            </header>

            <div className="dashboard-grid">
                {/* Left Column: Configuration */}
                <aside className="config-panel">
                    <div className="panel-card config-card">
                        <h2 className="panel-title"><Settings size={20} /> Game Setup</h2>

                        <div className="config-section">
                            <label>Target Letters</label>
                            <input
                                type="text"
                                value={letters.join('')}
                                onChange={handleLetterChange}
                                placeholder="AL"
                                className="letters-input"
                            />
                            <p className="hint">Type 2 letters (e.g., AL)</p>
                        </div>

                        <div className="config-section">
                            <label>Visual Style</label>
                            <div className="style-grid">
                                <button
                                    className={`style-option ${gameStyle === 'cyber' ? 'active' : ''}`}
                                    onClick={() => handleStyleClick('cyber')}
                                    type="button"
                                >
                                    <span className="style-preview neon">Aa</span>
                                    <span>Cyber</span>
                                </button>
                                <button
                                    className={`style-option ${gameStyle === 'hi-tech' ? 'active' : ''}`}
                                    onClick={() => handleStyleClick('hi-tech')}
                                    type="button"
                                >
                                    <span className="style-preview simple">Aa</span>
                                    <span>Hi-Tech</span>
                                </button>
                                <button
                                    className={`style-option ${gameStyle === 'steam' ? 'active' : ''}`}
                                    onClick={() => handleStyleClick('steam')}
                                    type="button"
                                >
                                    <span className="style-preview pixel">⚙️</span>
                                    <span>Steam</span>
                                </button>
                            </div>
                        </div>

                        <button
                            className="start-btn pulse-glow"
                            disabled={letters.length !== 2}
                            onClick={() => onStartGame(letters)}
                        >
                            <Play size={24} fill="currentColor" /> START SESSION
                        </button>

                        {onViewTutorial && (
                            <button className="tutorial-btn" onClick={onViewTutorial}>
                                <HelpCircle size={18} /> HOW TO PLAY
                            </button>
                        )}

                        {isAdmin && (
                            <a href="/admin.html" onClick={handleAdminAccess} className="tutorial-btn" style={{ borderColor: '#ff4444', color: '#ff4444', marginTop: '10px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <Shield size={18} /> ADMIN ACCESS
                            </a>
                        )}
                    </div>
                </aside>

                {/* Right Column: Analytics & Recommendations */}
                <main className="main-content">
                    {/* Recommendations Widget */}
                    <div className="panel-card recommendation-card">
                        <h2 className="panel-title"><Brain size={20} /> Personalized Recommendation</h2>
                        <div className="rec-content">
                            <div className="rec-icon-wrapper">
                                <Zap className="rec-icon" size={32} />
                            </div>
                            <div>
                                <h3>Tip #{currentRecIndex + 1}</h3>
                                <p>{currentRecommendation}</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Activity Widget (Mock) */}
                    <div className="panel-card activity-card">
                        <h2 className="panel-title"><Layout size={20} /> Recent Performance</h2>
                        <div className="activity-list">
                            <div className="activity-item">
                                <span className="activity-time">Today, 10:23 AM</span>
                                <span className="activity-desc">Session (A, S)</span>
                                <span className="activity-score positive">+450 XP</span>
                            </div>
                            <div className="activity-item">
                                <span className="activity-time">Yesterday</span>
                                <span className="activity-desc">Session (A, S, D)</span>
                                <span className="activity-score positive">+120 XP</span>
                            </div>
                            <div className="activity-item">
                                <span className="activity-time">2 Days Ago</span>
                                <span className="activity-desc">Session (A)</span>
                                <span className="activity-score positive">+890 XP</span>
                            </div>
                        </div>

                        {onViewHistory && (
                            <button className="view-graphs-btn" onClick={onViewHistory}>
                                <TrendingUp size={18} /> View Detailed Graphs
                            </button>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
