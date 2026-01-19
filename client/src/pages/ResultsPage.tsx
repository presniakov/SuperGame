import { Chart as ChartJS, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import type { GameResultData } from '../types';
import './ResultsPage.css';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function ResultsPage({ data, onRestart }: { data: GameResultData, onRestart: () => void }) {
    const successPoints = data.history.filter(e => e.result === 'hit').map(e => ({ x: e.timeOffset / 1000, y: e.speed, letter: e.letter }));
    const failPoints = data.history.filter(e => e.result !== 'hit').map(e => ({ x: e.timeOffset / 1000, y: e.speed, letter: e.letter }));

    const chartData = {
        datasets: [
            {
                label: 'Success',
                data: successPoints,
                backgroundColor: '#22c55e', // Neon Green
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBorderColor: '#fff',
                pointBorderWidth: 1
            },
            {
                label: 'Failure',
                data: failPoints,
                backgroundColor: '#ef4444', // Red
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBorderColor: '#fff',
                pointBorderWidth: 1
            }
        ]
    };

    const options: ChartOptions<'scatter'> = {
        responsive: true,
        plugins: {
            legend: {
                labels: {
                    color: '#e2e8f0', // Cyber Text
                    font: { family: 'Orbitron' }
                }
            },
            tooltip: {
                callbacks: {
                    label: (ctx: any) => {
                        const pt = ctx.raw as any;
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
                title: { display: true, text: 'Time (s)', color: '#64748b', font: { family: 'Rajdhani', size: 14 } },
                grid: {
                    color: 'rgba(100, 116, 139, 0.2)'
                },
                ticks: { color: '#94a3b8', font: { family: 'Rajdhani' } }
            },
            y: {
                title: { display: true, text: 'Speed (%)', color: '#64748b', font: { family: 'Rajdhani', size: 14 } },
                beginAtZero: true,
                grid: {
                    color: 'rgba(100, 116, 139, 0.2)'
                },
                ticks: { color: '#94a3b8', font: { family: 'Rajdhani' } }
            }
        }
    };

    return (
        <div className="results-page">
            <div className="results-header">
                <h1>Game Over</h1>
                <h2>Score: {data.score}</h2>
            </div>

            <div className="chart-container">
                <Scatter data={chartData} options={{ ...options, maintainAspectRatio: false }} />
            </div>

            <button onClick={onRestart} className="restart-btn">Play Again</button>
        </div>
    );
}
