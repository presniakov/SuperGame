import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import GameCanvas from './components/GameCanvas';
import LandingPage from './pages/LandingPage';
import PersonalPage from './pages/PersonalPage';
import ResultsPage from './pages/ResultsPage';
import TutorialPage from './pages/TutorialPage';
import ComingSoonPage from './pages/ComingSoonPage';
import type { GameResultData, GameStyle } from './types';
import './App.css';

function GameContainer() {
  const [socket, setSocket] = useState<Socket | null>(null);

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
    return (saved === 'cyber' || saved === 'hi-tech' || saved === 'steam') ? (saved as GameStyle) : 'cyber';
  });

  // Check for persistent session
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('username');
    if (savedToken && savedUser) {
      setUsername(savedUser);
      setView('menu');
    }
  }, []);

  // Apply visual theme globally when gameStyle changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', gameStyle);
    localStorage.setItem('site-theme', gameStyle);
  }, [gameStyle]);

  // Clean up socket on unmount (refresh/close)
  useEffect(() => {
    return () => {
      if (socket) socket.disconnect();
    };
  }, [socket]);

  const handleLoginSuccess = (user: string, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', user);
    setUsername(user);
    setView('menu');
  };

  const handleStartGame = (letters: string[]) => {
    // 1. Establish new connection
    const socketUrl = import.meta.env.PROD ? '/' : 'http://localhost:4000';
    const token = localStorage.getItem('token');

    const newSocket = io(socketUrl, {
      auth: { token }
    });
    setSocket(newSocket);

    // 2. Setup Listeners
    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      // If unauthorized, log out
      if (err.message.includes('Authentication error')) {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setUsername('');
        setView('landing');
        newSocket.disconnect();
        setSocket(null);
        alert('Session expired. Please log in again.');
      }
    });
    newSocket.on('connect', () => {
      // 3. Join Game
      newSocket.emit('join_game', { letters, userId: username });
    });

    newSocket.on('game_ready', () => {
      setView('game');
    });

    newSocket.on('game_over', (data: GameResultData) => {
      setResultData(data);
      setView('result');
      // Close connection on game over
      newSocket.disconnect();
      setSocket(null);
    });
  };

  const handleAbort = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setView('menu');
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
    return <GameCanvas socket={socket} onAbort={handleAbort} style={gameStyle} />;
  }

  if ((view === 'result' || view === 'history') && resultData) {
    return <ResultsPage data={resultData} onRestart={restart} />;
  }

  return <div>Loading...</div>;
}

export default function App() {
  return <GameContainer />;
}
