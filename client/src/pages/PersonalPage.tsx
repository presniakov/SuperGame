import { useState } from 'react';
import { Play, Settings, Zap, BarChart3, Brain, Layout, TrendingUp, HelpCircle } from 'lucide-react';
import type { GameStyle } from '../types';
import './PersonalPage.css';

interface PersonalPageProps {
    username: string;
    onStartGame: (letters: string[], style: GameStyle) => void;
    onViewHistory?: () => void;
    onViewTutorial?: () => void;
}

export default function PersonalPage({ username, onStartGame, onViewHistory, onViewTutorial }: PersonalPageProps) {
    const [letters, setLetters] = useState(['A', 'S']);
    const [selectedStyle, setSelectedStyle] = useState<GameStyle>('text-simple');

    const handleLetterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Allow up to 4 letters for variety, uppercase only, alpha only
        const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
        setLetters(val.split(''));
    };

    return (
        <div className="personal-page dashboard-layout">
            <header className="dashboard-header">
                <div className="header-left">
                    <div className="avatar-circle">{username.substring(0, 2).toUpperCase()}</div>
                    <div>
                        <h1>{username}</h1>
                        <p className="level-badge">Level 1 • Novice</p>
                    </div>
                </div>
                <div className="header-stats">
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
                            <label>Target Letters (Max 4)</label>
                            <input
                                type="text"
                                value={letters.join('')}
                                onChange={handleLetterChange}
                                placeholder="ASDF"
                                className="letters-input"
                            />
                            <p className="hint">Type letters to practice (e.g., ASDF)</p>
                        </div>

                        <div className="config-section">
                            <label>Visual Style</label>
                            <div className="style-grid">
                                <button
                                    className={`style-option ${selectedStyle === 'text-simple' ? 'active' : ''}`}
                                    onClick={() => setSelectedStyle('text-simple')}
                                >
                                    <span className="style-preview simple">Aa</span>
                                    <span>Simple</span>
                                </button>
                                <button
                                    className={`style-option ${selectedStyle === 'text-neon' ? 'active' : ''}`}
                                    onClick={() => setSelectedStyle('text-neon')}
                                >
                                    <span className="style-preview neon">Aa</span>
                                    <span>Neon</span>
                                </button>
                                <button
                                    className={`style-option ${selectedStyle === 'sprite-pixel' ? 'active' : ''}`}
                                    onClick={() => setSelectedStyle('sprite-pixel')}
                                >
                                    <span className="style-preview pixel">👾</span>
                                    <span>Pixel</span>
                                </button>
                            </div>
                        </div>

                        <button
                            className="start-btn pulse-glow"
                            disabled={letters.length === 0}
                            onClick={() => onStartGame(letters, selectedStyle)}
                        >
                            <Play size={24} fill="currentColor" /> START SESSION
                        </button>

                        {onViewTutorial && (
                            <button className="tutorial-btn" onClick={onViewTutorial}>
                                <HelpCircle size={18} /> HOW TO PLAY
                            </button>
                        )}
                    </div>
                </aside>

                {/* Right Column: Analytics & Recommendations */}
                <main className="main-content">
                    {/* Recommendations Widget */}
                    <div className="panel-card recommendation-card">
                        <h2 className="panel-title"><Brain size={20} /> AI Recommendation</h2>
                        <div className="rec-content">
                            <div className="rec-icon-wrapper">
                                <Zap className="rec-icon" size={32} />
                            </div>
                            <div>
                                <h3>Speed Training Recommended</h3>
                                <p>Your reaction time avg is <strong>450ms</strong>. Try to push it under 400ms today using the 'Neon' style for high contrast.</p>
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
