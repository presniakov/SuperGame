import { Chart as ChartJS, LinearScale, PointElement, LineElement, Tooltip, Legend, CategoryScale, Filler } from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Scatter, Line } from 'react-chartjs-2';
import { LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import type { GameResultData } from '../types';
import './ResultsPage.css';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, CategoryScale, Filler);

export default function ResultsPage({ data, onRestart }: { data: GameResultData, onRestart: () => void }) {
    // 1. Scatter Data (Speed vs Time)
    const successPoints = data.history.filter(e => e.result === 'hit').map(e => ({ x: e.timeOffset / 1000, y: e.speed, letter: e.letter }));
    const failPoints = data.history.filter(e => e.result !== 'hit').map(e => ({ x: e.timeOffset / 1000, y: e.speed, letter: e.letter }));

    // 2. Score Progress Data (Demo / Approx)
    let runningScore = 0;
    // Create a demo progression based on history or just mock points if "fake" is strictly requested.
    // Let's use the history-based approximation as it serves as a good "demo" of what the score looked like.
    const sortedHistory = [...data.history].sort((a, b) => a.timeOffset - b.timeOffset);
    const scorePoints = sortedHistory.map(e => {
        if (e.result === 'hit') runningScore += (100 + (e.speed * 10));
        else runningScore = Math.max(0, runningScore - 50);
        return { x: e.timeOffset / 1000, y: runningScore };
    });
    scorePoints.unshift({ x: 0, y: 0 });

    const chartData = {
        datasets: [
            {
                label: 'Success',
                data: successPoints,
                backgroundColor: '#22c55e',
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBorderColor: '#fff',
                pointBorderWidth: 1
            },
            {
                label: 'Failure',
                data: failPoints,
                backgroundColor: '#ef4444',
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBorderColor: '#fff',
                pointBorderWidth: 1
            }
        ]
    };

    const lineData = {
        datasets: [
            {
                label: 'Score (Demo)',
                data: scorePoints,
                borderColor: '#d946ef',
                backgroundColor: 'rgba(217, 70, 239, 0.2)',
                tension: 0.3,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6
            }
        ]
    };

    const commonOptions: any = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#94a3b8', font: { family: 'Orbitron' } } },
            tooltip: {
                callbacks: {
                    label: (ctx: any) => {
                        const pt = ctx.raw as any;
                        if (ctx.dataset.label.includes('Score')) return `Score: ${Math.round(pt.y)}`;
                        return `${ctx.dataset.label}: ${pt.letter} (Speed: ${pt.y.toFixed(1)})`;
                    }
                },
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#00f3ff',
                bodyColor: '#fff',
                borderColor: '#00f3ff',
                borderWidth: 1
            }
        },
        scales: {
            x: {
                type: 'linear',
                title: { display: true, text: 'Time (s)', color: '#64748b' },
                grid: { color: 'rgba(100, 116, 139, 0.1)' },
                ticks: { color: '#64748b' }
            },
            y: {
                grid: { color: 'rgba(100, 116, 139, 0.1)' },
                ticks: { color: '#64748b' }
            }
        }
    };

    const scatterOptions = {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            y: { ...commonOptions.scales.y, title: { display: true, text: 'Speed (%)', color: '#64748b' } }
        }
    };

    const lineOptions = {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            y: { ...commonOptions.scales.y, title: { display: true, text: 'Points', color: '#64748b' } }
        }
    };

    const [subView, setSubView] = useState<'performance' | 'score'>('performance');

    return (
        <div className="results-page">
            <div className="results-header">
                <h1>Game Results</h1>
                <h2>Final Score: {data.score}</h2>
            </div>

            <div className="chart-container">
                {subView === 'performance' ? (
                    <>
                        {/* <h3>Performance</h3> */}
                        <div style={{ position: 'relative', width: '100%', flex: 1 }}>
                            <Scatter data={chartData} options={scatterOptions} />
                        </div>
                    </>
                ) : (
                    <>
                        {/* <h3>Score Progress (Demo)</h3> */}
                        <div style={{ position: 'relative', width: '100%', flex: 1 }}>
                            <Line data={lineData} options={lineOptions} />
                        </div>
                    </>
                )}
            </div>

            <div className="results-actions">
                {subView === 'performance' ? (
                    <button onClick={() => setSubView('score')} className="secondary-btn">
                        View Score Progress
                    </button>
                ) : (
                    <button onClick={() => setSubView('performance')} className="secondary-btn">
                        Back to Performance
                    </button>
                )}

                <button onClick={onRestart} className="restart-btn dashboard-btn">
                    <LayoutDashboard size={24} />
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
}
