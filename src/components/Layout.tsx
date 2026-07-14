import React from 'react';
import { CheckSquare, Calendar, Trophy, Settings, Plus } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onQuickAddClick: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  onQuickAddClick,
  theme,
  toggleTheme,
}) => {
  return (
    <div id="app-frame" className="animate-fade-in">
      {/* App Header */}
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '27px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            SoloFlow
          </span>
          <div
            style={{
              background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
              color: '#ffe066', // Premium warm yellow
              fontFamily: '"Nanum Pen Script", cursive',
              fontSize: '20px',
              fontWeight: 'bold',
              padding: '3px 10px',
              borderRadius: '8px',
              marginLeft: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            더 이상 미루지마!
          </div>
        </div>
        
        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontSize: '16px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-fast)',
          }}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      {/* Main Content Area */}
      <div className="content-body">
        {children}
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="bottom-nav">
        <button
          className={`bottom-nav-item ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          <CheckSquare size={20} />
          <span>오늘</span>
        </button>

        <button
          className={`bottom-nav-item ${activeTab === 'weekly' ? 'active' : ''}`}
          onClick={() => setActiveTab('weekly')}
        >
          <Calendar size={20} />
          <span>주간/월간</span>
        </button>

        {/* Central Floating Action Button */}
        <div className="fab-container">
          <button
            className="fab-button"
            onClick={onQuickAddClick}
            aria-label="Quick Add Task"
          >
            <Plus size={28} />
          </button>
        </div>

        <button
          style={{ gridColumnStart: 4 }}
          className={`bottom-nav-item ${activeTab === 'category' ? 'active' : ''}`}
          onClick={() => setActiveTab('category')}
        >
          <Trophy size={20} />
          <span>목표관리</span>
        </button>

        <button
          className={`bottom-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={20} />
          <span>설정</span>
        </button>
      </nav>
    </div>
  );
};
export default Layout;
