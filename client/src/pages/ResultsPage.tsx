import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, TrendingUp, Calendar } from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Scatter, Line } from 'react-chartjs-2';
import type { IGameResult } from '../types';
import './ResultsPage.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface ResultsPageProps {
    onBack: () => void;
}

export default function ResultsPage({ onBack }: ResultsPageProps) {
    const [results, setResults] = useState<IGameResult[]>([]);
    const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'session' | 'progress'>('session');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const apiUrl = import.meta.env.PROD ? '/api' : 'http://localhost:4000/api';
            const res = await fetch(`${apiUrl}/user/history`, {
                headers: { 'x-auth-token': token || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setResults(data);
                if (data.length > 0) {
                    setSelectedResultId(data[0]._id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch history', err);
        } finally {
            setLoading(false);
        }
    };

    const selectedResult = useMemo(() =>
        results.find(r => r._id === selectedResultId) || null,
        [results, selectedResultId]);

    // Graph 1: Event Log (Scatter)
    const scatterData = useMemo(() => {
        if (!selectedResult) return { datasets: [] };

        const points = selectedResult.eventLog.map(e => ({
            x: e.timeOffset,
            y: e.speed,
            result: e.result,
            isDouble: e.eventType === 'double'
        }));

        return {
            datasets: [{
                label: 'Events',
                data: points,
                backgroundColor: (ctx: any) => {
                    const raw = ctx.raw as any;
                    if (!raw) return 'gray';
                    // User requested: Orange for success, Red for failure
                    return raw.result === 'hit' ? '#FFA500' : '#FF0000';
                },
                pointRadius: (ctx: any) => {
                    const raw = ctx.raw as any;
                    if (!raw) return 5;
                    // User requested: "bold dot for double event" -> larger size
                    return raw.isDouble ? 8 : 5;
                },
                pointBorderWidth: (ctx: any) => {
                    const raw = ctx.raw as any;
                    return raw && raw.isDouble ? 2 : 0;
                },
                borderColor: '#FFF',
            }]
        };
    }, [selectedResult]);

    // Graph 2: Score Progress (Line) - NOTE: Uses Max Speed as Score
    const progressData = useMemo(() => {
        // Sort chronological for line chart
        const sorted = [...results].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
            labels: sorted.map(r => new Date(r.date).toLocaleDateString()),
            datasets: [{
                label: 'Session Max Speed',
                data: sorted.map(r => r.maxSpeed || 0), // Use maxSpeed as score
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0, 212, 255, 0.2)',
                tension: 0.1
            }]
        };
    }, [results]);

    const scatterOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: true, text: 'Speed vs Time' },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const p = context.raw;
                        return `${p.result.toUpperCase()} | Speed: ${p.y} | Time: ${p.x}ms`;
                    }
                }
            }
        },
        scales: {
            x: { title: { display: true, text: 'Time (ms)' } },
            y: { title: { display: true, text: 'Speed' }, min: 0, max: 100 }
        }
    };

    const progressOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: true, text: 'Progress (Max Speed)' }
        }
    };

    if (loading) return <div className="loading-screen">Loading History...</div>;

    return (
        <div className="results-page">
            <header className="results-header">
                <button onClick={onBack} className="back-btn">
                    <ArrowLeft /> Back
                </button>
                <div className="header-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'session' ? 'active' : ''}`}
                        onClick={() => setActiveTab('session')}
                    >
                        Session Analysis
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
                        onClick={() => setActiveTab('progress')}
                    >
                        Progress History
                    </button>
                </div>
            </header>

            <div className="results-grid">
                {activeTab === 'session' && (
                    <>
                        {/* Session Selector */}
                        <div className="card control-card">
                            <label><Calendar size={18} /> Select Session</label>
                            <select
                                value={selectedResultId || ''}
                                onChange={(e) => setSelectedResultId(e.target.value)}
                                className="session-select"
                            >
                                {results.map(r => (
                                    <option key={r._id} value={r._id}>
                                        {new Date(r.date).toLocaleString()} (Max: {r.maxSpeed})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Main Scatter Plot */}
                        <div className="card chart-card scatter-card">
                            <div className="chart-wrapper">
                                {selectedResult ? (
                                    <Scatter options={scatterOptions} data={scatterData} />
                                ) : (
                                    <p className="no-data">No session selected</p>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'progress' && (
                    <div className="card chart-card progress-card full-width">
                        <div className="chart-header">
                            <h2><TrendingUp /> Progress History</h2>
                        </div>
                        <div className="chart-wrapper">
                            <Line options={progressOptions} data={progressData} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
