import { useState } from 'react';
import './PersonalPage.css';
import type { GameStyle } from '../types';

interface PersonalPageProps {
    username: string;
    onStartGame: (letters: string[], style: GameStyle) => void;
}

export default function PersonalPage({ username, onStartGame }: PersonalPageProps) {
    const [letters, setLetters] = useState(['A', 'S']);
    const [selectedStyle, setSelectedStyle] = useState<GameStyle>('text-simple');

    return (
        <div className="personal-page">
            <div className="personal-card">
                <h1>Welcome, {username}!</h1>
                <p>Ready to train your brain?</p>

                <div className="game-setup">
                    <label>Target Letters (2)</label>
                    <input
                        type="text"
                        value={letters.join('')}
                        onChange={e => setLetters(e.target.value.toUpperCase().split('').slice(0, 2))}
                        maxLength={2}
                        placeholder="AS"
                    />
                    <p className="hint">Select 2 letters to play with</p>
                </div>

                <div className="game-setup">
                    <label>Visual Style</label>
                    <select
                        value={selectedStyle}
                        onChange={(e) => setSelectedStyle(e.target.value as GameStyle)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '2px solid #334155' }}
                    >
                        <option value="text-simple">Simple Text</option>
                        <option value="text-neon">Neon Text</option>
                        <option value="sprite-pixel">Pixel Sprites (Images)</option>
                    </select>
                </div>

                <button
                    className="start-btn"
                    disabled={letters.some(l => !l)}
                    onClick={() => onStartGame(letters, selectedStyle)}
                >
                    START GAME
                </button>
            </div>
        </div>
    );
}
