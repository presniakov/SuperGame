import { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import GameCanvas from './components/GameCanvas';
import LandingPage from './pages/LandingPage';
import PersonalPage from './pages/PersonalPage';
import ResultsPage from './pages/ResultsPage';
import type { GameResultData, GameStyle } from './types';
import './App.css';

function GameContainer() {
  const socket = useSocket();
  const [view, setView] = useState<'landing' | 'menu' | 'game' | 'result'>('landing');
  const [resultData, setResultData] = useState<GameResultData | null>(null);
  const [username, setUsername] = useState('');
  const [gameStyle, setGameStyle] = useState<GameStyle>('text-simple');

  useEffect(() => {
    if (!socket) return;

    socket.on('disconnect', () => {
      console.log('Disconnected form server');
    });

    socket.on('game_ready', () => {
      setView('game');
    });

    socket.on('game_over', (data: GameResultData) => {
      setResultData(data);
      setView('result');
    });

    return () => {
      socket.off('disconnect');
      socket.off('game_ready');
      socket.off('game_over');
    };
  }, [socket]);

  const handleLoginSuccess = (user: string) => {
    setUsername(user);
    setView('menu');
  };

  const handleStartGame = (letters: string[], style: GameStyle) => {
    setGameStyle(style);
    socket?.emit('join_game', { letters, userId: username });
    // Wait for 'game_ready' to switch view
  };

  const restart = () => {
    setView('menu');
  };

  if (view === 'landing') {
    return <LandingPage onLogin={handleLoginSuccess} />;
  }

  if (view === 'menu') {
    return <PersonalPage username={username} onStartGame={handleStartGame} />;
  }

  if (view === 'game') {
    return <GameCanvas socket={socket} onAbort={() => setView('menu')} style={gameStyle} />;
  }

  if (view === 'result' && resultData) {
    return <ResultsPage data={resultData} onRestart={restart} />;
  }

  return <div>Loading...</div>;
}

import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <GameContainer />
      </SocketProvider>
    </ThemeProvider>
  );
}
