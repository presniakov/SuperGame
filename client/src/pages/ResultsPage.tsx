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
    theme: string; // Receive theme to trigger updates
}

export default function ResultsPage({ onBack, theme }: ResultsPageProps) {
    const [results, setResults] = useState<IGameResult[]>([]);
    const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'session' | 'progress'>('session');

    // Helper to get theme colors
    const getThemeColor = (variable: string) => {
        return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    };

    // Memoize colors based on theme to trigger re-read
    const themeColors = useMemo(() => ({
        hit: getThemeColor('--neon-cyan') || '#00d4ff', // cyan/blue logic
        miss: getThemeColor('--neon-pink') || '#ff0055',
        primary: getThemeColor('--neon-blue') || '#00d4ff',
        text: getThemeColor('--cyber-text') || '#aaa',
        grid: getThemeColor('--cyber-dim') || '#333'
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [theme]); // Re-run when theme changes

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
    interface ChartPoint {
        x: number;
        y: number;
        result: string;
        isDouble: boolean;
    }

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
                backgroundColor: (ctx: { raw: unknown }) => {
                    const raw = ctx.raw as ChartPoint;
                    if (!raw) return 'gray';
                    return raw.result === 'hit' ? themeColors.hit : themeColors.miss;
                },
                pointRadius: (ctx: { raw: unknown }) => {
                    const raw = ctx.raw as ChartPoint;
                    if (!raw) return 5;
                    return raw.isDouble ? 8 : 5;
                },
                pointBorderWidth: (ctx: { raw: unknown }) => {
                    const raw = ctx.raw as ChartPoint;
                    return raw && raw.isDouble ? 2 : 0;
                },
                borderColor: '#FFF',
            }]
        };

    }, [selectedResult, themeColors]); // Depend on themeColors

    // Graph 2: Score Progress
    const progressData = useMemo(() => {
        const sorted = [...results].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
            labels: sorted.map(r => new Date(r.date).toLocaleDateString()),
            datasets: [{
                label: 'Session Max Speed',
                data: sorted.map(r => r.statistics?.maxSpeed || 0),
                borderColor: themeColors.primary,
                backgroundColor: themeColors.primary, // transparency handling tricky with hex, keeping solid or adding opacity manually if needed
                tension: 0.1
            }]
        };
    }, [results, themeColors]);

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false, labels: { color: themeColors.text } },
            title: { display: true, color: themeColors.text },
            tooltip: {
                titleColor: themeColors.text,
                bodyColor: themeColors.text,
                backgroundColor: 'rgba(0,0,0,0.8)'
            }
        },
        scales: {
            x: {
                title: { display: true, text: 'Time (ms)', color: themeColors.text },
                ticks: { color: themeColors.text },
                grid: { color: 'rgba(255,255,255,0.1)' }
            },
            y: {
                title: { display: true, text: 'Speed', color: themeColors.text },
                min: 0,
                max: 100,
                ticks: { color: themeColors.text },
                grid: { color: 'rgba(255,255,255,0.1)' }
            }
        }
    };

    const scatterOptions = {
        ...chartOptions,
        plugins: {
            ...chartOptions.plugins,
            title: { ...chartOptions.plugins.title, text: 'Speed vs Time' }
        }
    };

    const progressOptions = {
        ...chartOptions,
        plugins: {
            ...chartOptions.plugins,
            title: { ...chartOptions.plugins.title, text: 'Progress (Max Speed)' }
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
                                        {new Date(r.date).toLocaleString()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Session Statistics */}
                        <div className="card stats-card">
                            <h3>Session Statistics</h3>
                            {selectedResult?.statistics ? (
                                <div className="stats-grid">
                                    <div className="stat-item">
                                        <span className="label">Start Speed</span>
                                        <span className="value">{selectedResult.statistics.startSpeed}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="label">Max Speed</span>
                                        <span className="value">{selectedResult.statistics.maxSpeed.toFixed(1)}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="label">Event Count</span>
                                        <span className="value">{selectedResult.eventLog.length}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="label">Total Score</span>
                                        <span className="value">{selectedResult.statistics.totalScore || 0}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="label">Error Rate (First 2/3)</span>
                                        <span className="value">{selectedResult.statistics.errorRateFirst23.toFixed(1)}%</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="label">Error Rate (Last 1/3)</span>
                                        <span className="value">{selectedResult.statistics.errorRateLast13.toFixed(1)}%</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="no-data">No statistics available</p>
                            )}
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
