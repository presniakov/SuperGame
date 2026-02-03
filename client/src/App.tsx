import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import GameCanvas from './components/GameCanvas';
import LandingPage from './pages/LandingPage';
import PersonalPage from './pages/PersonalPage';
import ResultsPage from './pages/ResultsPage';
import TutorialPage from './pages/TutorialPage';
import ComingSoonPage from './pages/ComingSoonPage';
import type { GameStyle } from './types';
import './App.css';

// Lazy load Admin Dashboard handled via separate app entry (admin.html)

function GameContainer() {
  const [socket, setSocket] = useState<Socket | null>(null);

  // Check URL params for dev access
  const params = new URLSearchParams(window.location.search);
  const isDevAccess = params.get('dev') === 'supergame_dev';


  // resultData is no longer needed in App state as ResultsPage fetches history
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
  const [userId, setUserId] = useState(''); // Store Mongo _id
  const [gameDuration, setGameDuration] = useState(180000); // in ms
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user');
  const [gameStyle, setGameStyle] = useState<GameStyle>(() => {
    const saved = localStorage.getItem('site-theme');
    return (saved === 'cyber' || saved === 'hi-tech' || saved === 'steam') ? (saved as GameStyle) : 'cyber';
  });
  const [userProfile, setUserProfile] = useState<string>('Candidate');

  const [view, setView] = useState<'landing' | 'menu' | 'game' | 'result' | 'history' | 'tutorial' | 'coming-soon'>(() => {
    if (isDevAccess) return 'landing';
    const savedToken = localStorage.getItem('token');
    return savedToken ? 'menu' : 'coming-soon';
  });

  // Check for persistent session - Sync only
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      // Sync with backend
      const apiUrl = import.meta.env.PROD ? '/api' : 'http://localhost:4000/api';
      fetch(`${apiUrl}/user/me`, {
        headers: { 'x-auth-token': savedToken }
      })
        .then(res => res.json())
        .then(data => {
          if (data._id) {
            setUserId(data._id);
          }
          if (data.preferences?.theme) {
            setGameStyle(data.preferences.theme as GameStyle);
          }
          if (data.role) {
            setUserRole(data.role);
          }
          if (data.preferences?.profile) {
            setUserProfile(data.preferences.profile);
          }
        })
        .catch(console.error);
    }
  }, []);

  // Apply visual theme globally when gameStyle changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', gameStyle);
    localStorage.setItem('site-theme', gameStyle);

    const token = localStorage.getItem('token');
    if (token) {
      const apiUrl = import.meta.env.PROD ? '/api' : 'http://localhost:4000/api';
      fetch(`${apiUrl}/user/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ theme: gameStyle })
      }).catch(err => console.error('Failed to sync preferences:', err));
    }
  }, [gameStyle]);

  // Clean up socket on unmount (refresh/close)
  useEffect(() => {
    return () => {
      if (socket) socket.disconnect();
    };
  }, [socket]);

  const handleLoginSuccess = (id: string, user: string, token: string, preferences?: { theme: string }, role?: 'user' | 'admin') => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', user);
    setUsername(user);
    setUserId(id);
    if (role) setUserRole(role);

    if (preferences?.theme) {
      setGameStyle(preferences.theme as GameStyle);
    } else {
      setGameStyle('cyber');
    }

    // Type assertion or check might be needed if preferences is any
    if ((preferences as any)?.profile) {
      setUserProfile((preferences as any).profile);
    }

    setView('menu');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setGameStyle('cyber');
    setUsername('');
    setUserId('');
    setUserRole('user');
    setUserProfile('Candidate');
    setView('landing');
  };

  const handleStartGame = (letters: string[]) => {
    const socketUrl = import.meta.env.PROD ? '/' : 'http://localhost:4000';
    const token = localStorage.getItem('token');

    const newSocket = io(socketUrl, {
      auth: { token }
    });
    setSocket(newSocket);

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
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
      newSocket.emit('join_game', { letters, userId: userId || username }); // Fallback to username if ID missing (shouldn't happen for logged in)
    });

    newSocket.on('game_ready', (data: { duration: number }) => {
      if (data && data.duration) {
        setGameDuration(data.duration);
      }
      setView('game');
    });

    newSocket.on('game_over', () => {
      // Navigate to 'result' view, which will load the ResultsPage (history)
      setView('result');
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
    setView('history');
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
        onLogout={handleLogout}
        isAdmin={userRole === 'admin'}
        userProfile={userProfile}
      />
    );
  }

  if (view === 'game') {
    return <GameCanvas socket={socket} onAbort={handleAbort} style={gameStyle} duration={gameDuration} />;
  }

  if (view === 'result' || view === 'history') {
    return <ResultsPage onBack={() => setView('menu')} theme={gameStyle} />;
  }

  return <div>Loading...</div>;
}

export default function App() {
  return <GameContainer />;
}
