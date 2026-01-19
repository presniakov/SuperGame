import './ComingSoonPage.css';
import { Rocket } from 'lucide-react';

export default function ComingSoonPage() {
    return (
        <div className="coming-soon-container">
            <div className="coming-soon-content">
                <div className="icon-pulse">
                    <Rocket size={64} className="rocket-icon" />
                </div>
                <h1 className="glitch-text" data-text="COMING SOON">COMING SOON</h1>
                <p>The next generation of cognitive training is comming soon...</p>
                <div className="progress-bar-container">
                    <div className="progress-bar"></div>
                </div>
                <span className="version-tag">v0.9.0-beta</span>
            </div>
        </div>
    );
}
