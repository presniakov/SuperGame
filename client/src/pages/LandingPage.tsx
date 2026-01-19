import { useState } from 'react';
import LoginModal from '../components/LoginModal';
import './LandingPage.css';

interface LandingPageProps {
    onLogin: (username: string) => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
    const [isModalOpen, setModalOpen] = useState(false);

    return (
        <div className="landing-container">
            {isModalOpen && <LoginModal onClose={() => setModalOpen(false)} onSuccess={onLogin} />}

            <header className="landing-header">
                <div className="logo">SuperGame</div>
                <button className="login-btn" onClick={() => setModalOpen(true)}>Login</button>
            </header>

            <main>
                <section className="hero-section">
                    <h1>Elevate Your Mind</h1>
                    <p className="hero-text">
                        Transform your cognitive abilities with scientifically-designed brain training games.
                        Boost memory, focus, and problem-solving skills in
                    </p>
                    <p className="hero-text">
                        just 3 minutes a day.
                    </p>
                </section>

                <section className="features-section">
                    <h2>Why Choose SuperGame?</h2>
                    <p className="section-desc">
                        This program will help you quickly and efficiently process various types of information and work in a flow.
                        It will teach you how to adapt, stabilize in uncomfortable situations, and ignore distractions.
                    </p>

                    <div className="features-grid">
                        <div className="feature-card">
                            <h3>Memory Enhancement</h3>
                            <p>Strengthen your working memory and recall abilities through adaptive exercises designed by neuroscientists.</p>
                        </div>

                        <div className="feature-card">
                            <h3>Focus Training</h3>
                            <p>Improve attention span and concentration with targeted exercises that challenge your focus mechanisms.</p>
                        </div>

                        <div className="feature-card">
                            <h3>Problem Solving</h3>
                            <p>Enhance logical thinking and analytical skills through progressively challenging puzzle-based games.</p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
