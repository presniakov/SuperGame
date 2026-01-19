import { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import GameCanvas from './components/GameCanvas';
import LandingPage from './pages/LandingPage';
import PersonalPage from './pages/PersonalPage';
import ResultsPage from './pages/ResultsPage';
import TutorialPage from './pages/TutorialPage';
import ComingSoonPage from './pages/ComingSoonPage';
import type { GameResultData, GameStyle } from './types';
import './App.css';

function GameContainer() {
  const socket = useSocket();
  // Check URL params for dev access
  const params = new URLSearchParams(window.location.search);
  const isDevAccess = params.get('dev') === 'supergame_dev';

  const [view, setView] = useState<'landing' | 'menu' | 'game' | 'result' | 'history' | 'tutorial' | 'coming-soon'>(
    isDevAccess ? 'landing' : 'coming-soon'
  );
  const [resultData, setResultData] = useState<GameResultData | null>(null);
  const [username, setUsername] = useState('');
  const [gameStyle, setGameStyle] = useState<GameStyle>(() => {
    const saved = localStorage.getItem('site-theme');
    return (saved === 'lab' || saved === 'steam') ? (saved as GameStyle) : 'cyber';
  });

  // Apply visual theme globally when gameStyle changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', gameStyle);
    localStorage.setItem('site-theme', gameStyle);
  }, [gameStyle]);

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

  const handleStartGame = (letters: string[]) => {
    // Style is already set in state
    socket?.emit('join_game', { letters, userId: username });
    // Wait for 'game_ready' to switch view
  };

  const handleViewHistory = () => {
    // In a real app, fetch history. For now, use mock or last result.
    if (!resultData) {
      // Mock data if no recent game
      setResultData({
        score: 15600,
        history: [
          { timeOffset: 1000, speed: 20, result: 'hit', letter: 'A' },
          { timeOffset: 2000, speed: 22, result: 'hit', letter: 'S' },
          { timeOffset: 3000, speed: 25, result: 'miss', letter: 'A' },
          { timeOffset: 4500, speed: 22, result: 'hit', letter: 'S' },
          { timeOffset: 6000, speed: 24, result: 'hit', letter: 'A' },
          { timeOffset: 7500, speed: 28, result: 'hit', letter: 'S' },
          { timeOffset: 9000, speed: 32, result: 'hit', letter: 'A' }
        ]
      });
    }
    setView('history');
  };

  const restart = () => {
    setView('menu');
  };

  if (view === 'coming-soon') {
    return <ComingSoonPage />;
  }

  if (view === 'landing') {
    return <LandingPage onLogin={handleLoginSuccess} />;
  }

  if (view === 'tutorial') {
    return <TutorialPage onBack={() => setView('menu')} />;
  }

  if (view === 'menu') {
    return (
      <PersonalPage
        username={username}
        gameStyle={gameStyle}
        onStyleChange={setGameStyle}
        onStartGame={handleStartGame}
        onViewHistory={handleViewHistory}
        onViewTutorial={() => setView('tutorial')}
      />
    );
  }

  if (view === 'game') {
    return <GameCanvas socket={socket} onAbort={() => setView('menu')} style={gameStyle} />;
  }

  if ((view === 'result' || view === 'history') && resultData) {
    return <ResultsPage data={resultData} onRestart={restart} />;
  }

  return <div>Loading...</div>;
}

export default function App() {
  return (
    <SocketProvider>
      <GameContainer />
    </SocketProvider>
  );
}
