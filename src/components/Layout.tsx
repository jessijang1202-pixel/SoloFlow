import React from 'react';
import { CheckSquare, Calendar, Folder, CheckCircle, Plus } from 'lucide-react';

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
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '18px',
            }}
          >
            S
          </div>
          <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            SoloFlow
          </span>
          <span
            style={{
              fontFamily: '"Nanum Pen Script", cursive',
              fontSize: '17px',
              color: 'var(--accent-color)',
              marginLeft: '4px',
              alignSelf: 'flex-end',
              marginBottom: '1px',
            }}
          >
            더이상 미루지 마!
          </span>
        </div>
        
        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all var(--transition-fast)',
          }}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? '☀️ 라이트' : '🌙 다크'}
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
          <span>주간</span>
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
          <Folder size={20} />
          <span>카테고리</span>
        </button>

        <button
          className={`bottom-nav-item ${activeTab === 'done' ? 'active' : ''}`}
          onClick={() => setActiveTab('done')}
        >
          <CheckCircle size={20} />
          <span>완료</span>
        </button>
      </nav>
    </div>
  );
};
export default Layout;
