import React from 'react';
import ReactDOM from 'react-dom/client';
import LandingView from './views/LandingView';
import './index.css';
import './App.css';

ReactDOM.createRoot(document.getElementById('landing-root')!).render(
  <React.StrictMode>
    <LandingView onNavigateToApp={() => { window.location.href = '/'; }} />
  </React.StrictMode>
);
