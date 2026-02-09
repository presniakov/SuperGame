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
import { SessionType } from '../types';
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
            // If 401, maybe redirect or just show empty?
            // Auth issues handled by App usually, but if we are here...
            if (err instanceof Error && err.message.includes('401')) {
                // Should potentially trigger logout?
                // For now just stop loading
            }
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

    const themeReactionColor = useMemo(() => {
        // Choose unused contrast color per theme
        // Cyber: uses Cyan/Pink/Blue. Yellow (#facc15) fits.
        // Steam: uses Orange/Dark. Green (#10b981) fits.
        // Hi-Tech: uses Navy/Blue. Red (#ef4444) fits.
        if (theme === 'steam') return '#10b981';
        if (theme === 'hi-tech') return '#ef4444';
        return '#facc15'; // Cyber default
    }, [theme]);

    const scatterData = useMemo(() => {
        if (!selectedResult) return { datasets: [] };

        const points = selectedResult.eventLog.map(e => ({
            x: e.timeOffset / 1000,
            y: e.speed,
            result: e.result,
            isDouble: e.eventType === 'double'
        }));

        const reactionPoints = selectedResult.eventLog.map(e => ({
            x: e.timeOffset / 1000,
            y: e.eventDuration || 0, // Fallback if missing
            result: e.result
        }));

        return {
            datasets: [
                {
                    label: 'Speed',
                    data: points,
                    backgroundColor: (ctx: { raw: unknown }) => {
                        const raw = ctx.raw as ChartPoint;
                        if (!raw) return 'gray';
                        return raw.result === 'hit' ? themeColors.hit : themeColors.miss;
                    },
                    pointRadius: (ctx: { raw: unknown }) => {
                        const raw = ctx.raw as ChartPoint;
                        if (!raw) return 2.5;
                        return raw.isDouble ? 3.5 : 2.5;
                    },
                    pointBorderWidth: (ctx: { raw: unknown }) => {
                        const raw = ctx.raw as ChartPoint;
                        return raw && raw.isDouble ? 1 : 0;
                    },
                    borderColor: '#FFF',
                    yAxisID: 'y'
                },
                {
                    label: 'Reaction Time (ms)',
                    data: reactionPoints,
                    backgroundColor: themeReactionColor,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                    borderColor: themeReactionColor,
                    pointStyle: 'rectRot', // Different shape
                    yAxisID: 'y2'
                }
            ]
        };

    }, [selectedResult, themeColors, themeReactionColor]);

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
                title: { display: true, text: 'Time (s)', color: themeColors.text },
                ticks: {
                    color: themeColors.text,
                    callback: (val: number | string) => typeof val === 'number' ? val.toFixed(3) : val
                },
                grid: { color: 'rgba(255,255,255,0.1)' }
            },
            y: {
                title: { display: true, text: 'Speed', color: themeColors.text },
                min: 0,
                max: 200,
                ticks: { color: themeColors.text },
                grid: { color: 'rgba(255,255,255,0.1)' }
            }
        }
    };

    const scatterOptions = {
        ...chartOptions,
        scales: {
            ...chartOptions.scales,
            x: {
                ...chartOptions.scales.x,
                min: 0,
                max: 200
            },
            y: {
                ...chartOptions.scales.y, // Current Speed axis
                position: 'left' as const
            },
            y2: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                title: { display: true, text: 'Reaction (ms)', color: themeReactionColor },
                min: 0,
                max: 3000,
                grid: {
                    drawOnChartArea: false, // Don't clutter grid
                    color: themeReactionColor
                },
                ticks: { color: themeReactionColor }
            }
        },
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
                                    <div className="stat-item span-2">
                                        <span className="label">Session Type</span>
                                        <span className="value highlight">{selectedResult.sessionType || 'The Grind'}</span>
                                        {selectedResult.userProfile && (
                                            <span className="sub-value" style={{ display: 'block', fontSize: '0.8em', color: '#888', marginTop: '4px' }}>
                                                Profile: {selectedResult.userProfile}
                                            </span>
                                        )}
                                    </div>
                                    <div className="stat-item">
                                        <span className="label">Session #</span>
                                        <span className="value highlight">{selectedResult.sessionNumber ? `#${selectedResult.sessionNumber}` : '-'}</span>
                                    </div>
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
                                    {selectedResult.sessionType !== SessionType.CALIBRATION ? (
                                        <>
                                            <div className="stat-item">
                                                <span className="label">Error Rate (First 2/3)</span>
                                                <span className="value">{selectedResult.statistics.errorRateFirst23.toFixed(1)}%</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="label">Error Rate (Last 1/3)</span>
                                                <span className="value">{selectedResult.statistics.errorRateLast13.toFixed(1)}%</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="stat-item span-2">
                                            <span className="label">Total Error Rate</span>
                                            <span className="value">{(selectedResult.statistics.totalErrorRate || 0).toFixed(1)}%</span>
                                        </div>
                                    )}
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
