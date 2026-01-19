import { ArrowLeft, BookOpen } from 'lucide-react';
import './TutorialPage.css';

interface TutorialPageProps {
    onBack: () => void;
}

export default function TutorialPage({ onBack }: TutorialPageProps) {
    return (
        <div className="tutorial-page">
            <div className="tutorial-container">
                <header className="tutorial-header">
                    <BookOpen size={48} className="tutorial-icon" />
                    <h1>How to Play</h1>
                    <p className="subtitle">Official Training Guidelines</p>
                </header>

                <div className="tutorial-content">
                    <ul className="instruction-list">
                        <li>
                            <span className="bullet">01</span>
                            <p>Take a comfortable position.</p>
                        </li>
                        <li>
                            <span className="bullet">02</span>
                            <p>Play in a calm environment with minimal distractions.</p>
                        </li>
                        <li>
                            <span className="bullet">03</span>
                            <p>Look at the center of the screen. During the game, try to keep your gaze on the center.</p>
                        </li>
                        <li>
                            <span className="bullet">04</span>
                            <p>Pay attention to your breathing. Breathe in a relaxed manner.</p>
                        </li>
                        <li>
                            <span className="bullet">05</span>
                            <p>Don't dwell on mistakes — keep playing.</p>
                        </li>
                        <li>
                            <span className="bullet">06</span>
                            <p>Eliminate the moment of anticipation (don't guess); simply react to the appearing symbol (event).</p>
                        </li>
                        <li>
                            <span className="bullet">07</span>
                            <p>If during the game you feel overloaded and unable to cope, stop playing. Take a break for 1-2 days.</p>
                        </li>
                        <li>
                            <span className="bullet">08</span>
                            <p>It is recommended that the player periodically (every 2 weeks) change the letters (symbols) — one of the two or both at once.</p>
                        </li>
                    </ul>
                </div>

                <div className="tutorial-footer">
                    <button onClick={onBack} className="back-btn">
                        <ArrowLeft size={20} /> Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
