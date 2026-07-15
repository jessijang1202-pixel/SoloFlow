import React, { useRef, useState, useEffect } from 'react';
import { 
  Download, 
  Upload, 
  Trash2, 
  Bell, 
  Plus, 
  Lock, 
  AlertTriangle, 
  RefreshCw,
  LogOut
} from 'lucide-react';
import type { Task } from '../services/todoService';
import type { Category } from '../services/categoryService';
import { categoryService } from '../services/categoryService';
import { supabase } from '../services/supabaseClient';

interface SettingsViewProps {
  tasks: Task[];
  onImportData: (importedTasks: Task[]) => void;
  onClearAllData: () => void;
  categories: Category[];
  onAddCategory: (name: string, color: string, isProject?: boolean, description?: string) => void;
  onDeleteCategory: (id: string) => void;
  onLogout: () => void;
  isInstallable: boolean;
  onInstallClick: () => void;
  onLoginClick: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  tasks,
  onImportData,
  onClearAllData,
  categories,
  onAddCategory,
  onDeleteCategory,
  onLogout,
  isInstallable,
  onInstallClick,
  onLoginClick,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'project' | 'category' | 'system'>('project');
  
  const [userEmail, setUserEmail] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase) return;
    
    // Get initial user
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data?.user?.email || null);
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Form States for Projects
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [selectedProjColor, setSelectedProjColor] = useState('#3b82f6');

  // Form States for Categories
  const [newCatName, setNewCatName] = useState('');
  const [selectedCatColor, setSelectedCatColor] = useState('#10b981');

  // Project deletion custom options modal state
  const [projectToDelete, setProjectToDelete] = useState<Category | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  const COLOR_PRESETS = [
    '#3b82f6', '#10b981', '#ef4444', '#ec4899',
    '#f59e0b', '#8b5cf6', '#14b8a6', '#f97316',
    '#06b6d4', '#84cc16', '#a855f7', '#6b7280',
  ];

  // Submit Handler for New Project
  const handleAddProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    if (categories.some(c => c.name.trim() === newProjName.trim())) {
      alert('이미 존재하는 이름입니다. 다른 이름을 사용해 주세요.');
      return;
    }

    onAddCategory(newProjName.trim(), selectedProjColor, true, newProjDesc.trim());
    setNewProjName('');
    setNewProjDesc('');
    
    // Auto color switch helper
    const nextIdx = (COLOR_PRESETS.indexOf(selectedProjColor) + 1) % COLOR_PRESETS.length;
    setSelectedProjColor(COLOR_PRESETS[nextIdx]);
    alert('새 프로젝트가 추가되었습니다!');
  };

  // Submit Handler for New Category
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    if (categories.some(c => c.name.trim() === newCatName.trim())) {
      alert('이미 존재하는 이름입니다. 다른 이름을 사용해 주세요.');
      return;
    }

    onAddCategory(newCatName.trim(), selectedCatColor, false, '');
    setNewCatName('');
    
    // Auto color switch helper
    const nextIdx = (COLOR_PRESETS.indexOf(selectedCatColor) + 1) % COLOR_PRESETS.length;
    setSelectedCatColor(COLOR_PRESETS[nextIdx]);
    alert('새 카테고리가 추가되었습니다!');
  };

  // Project deletion confirm helper
  const handleConfirmDeleteProject = (convertToCategory: boolean) => {
    if (!projectToDelete) return;

    if (convertToCategory) {
      // Downgrade to regular category
      categoryService.toggleProjectMode(projectToDelete.id, false);
      alert(`'${projectToDelete.name}' 프로젝트가 일반 카테고리로 변경되었습니다.`);
    } else {
      // Remove completely
      onDeleteCategory(projectToDelete.id);
      alert(`'${projectToDelete.name}' 프로젝트가 완전히 삭제되었습니다.`);
    }

    setProjectToDelete(null);
    setShowDeleteConfirmModal(false);
    window.location.reload(); // Simple reload to refresh all views
  };

  // Export tasks as JSON file
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute("download", `soloflow_backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import tasks from JSON file
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          const isValid = parsed.every(t => t && typeof t.id === 'string' && typeof t.title === 'string');
          if (isValid) {
            onImportData(parsed);
            alert(`성공적으로 ${parsed.length}개의 일정을 불러왔습니다!`);
          } else {
            alert('올바르지 않은 백업 파일 형식입니다.');
          }
        } else {
          alert('데이터 구조가 올바르지 않습니다. 배열 형식이어야 합니다.');
        }
      } catch (err) {
        alert('파일을 파싱하는 중 오류가 발생했습니다.');
      }
    };
    fileReader.readAsText(files[0]);
  };

  // Notifications logic
  const triggerMockNotification = () => {
    const incompleteTasks = tasks.filter(t => t.status !== 'done' && !t.isWeeklyGoal && !t.isMonthlyGoal);
    
    if (incompleteTasks.length === 0) {
      alert('오늘 남은 미완료 일정이 없습니다. 멋집니다! 🎉');
      return;
    }

    if ("Notification" in window) {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification("SoloFlow 일과 알림", {
            body: `오늘 아직 해결하지 못한 일정이 ${incompleteTasks.length}개 있습니다. 잊지 말고 확인해 보세요!`,
            icon: '/favicon.ico'
          });
        } else {
          alert(`[SoloFlow 리마인더]\n오늘 미완료된 업무가 ${incompleteTasks.length}개 있습니다. 퇴근 전 확인하세요!`);
        }
      });
    } else {
      alert(`[SoloFlow 리마인더]\n오늘 미완료된 업무가 ${incompleteTasks.length}개 있습니다. 퇴근 전 확인하세요!`);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* View Header */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>설정</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          프로젝트, 카테고리 관리 및 어플리케이션 환경을 설정합니다.
        </p>
      </div>

      {/* Settings Sub-tab switch headers */}
      <div className="project-tabs-container" style={{ padding: '2px' }}>
        <button
          className={`project-tab-btn ${activeSettingsTab === 'project' ? 'active' : ''}`}
          onClick={() => setActiveSettingsTab('project')}
          style={{ fontSize: '13px', padding: '8px 10px' }}
        >
          💼 프로젝트 관리
        </button>
        <button
          className={`project-tab-btn ${activeSettingsTab === 'category' ? 'active' : ''}`}
          onClick={() => setActiveSettingsTab('category')}
          style={{ fontSize: '13px', padding: '8px 10px' }}
        >
          📂 카테고리 관리
        </button>
        <button
          className={`project-tab-btn ${activeSettingsTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveSettingsTab('system')}
          style={{ fontSize: '13px', padding: '8px 10px' }}
        >
          ⚙️ 시스템/백업
        </button>
      </div>

      {/* ----------------- PROJECTS TAB ----------------- */}
      {activeSettingsTab === 'project' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* New Project Creator Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <Plus size={16} style={{ color: 'var(--accent-color)' }} />
              신규 프로젝트 추가
            </h2>
            <form onSubmit={handleAddProjectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  className="text-input"
                  style={{ minHeight: '40px', padding: '10px', fontSize: '14px' }}
                  placeholder="프로젝트명 (예: 신규 홈페이지 개발)"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  required
                />
                
                {/* Horizontal Circle Color Grid Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>프로젝트 색상 선택</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedProjColor(color)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: color,
                          border: selectedProjColor === color ? '2px solid var(--text-primary)' : '1px solid var(--border-color)',
                          cursor: 'pointer',
                          padding: 0,
                          boxShadow: selectedProjColor === color ? '0 0 8px var(--accent-color)' : 'none',
                          transform: selectedProjColor === color ? 'scale(1.1)' : 'scale(1)',
                          transition: 'all var(--transition-fast)'
                        }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <input
                type="text"
                className="text-input"
                style={{ minHeight: '40px', padding: '10px', fontSize: '14px' }}
                placeholder="프로젝트 상세 설명 요약"
                value={newProjDesc}
                onChange={(e) => setNewProjDesc(e.target.value)}
              />

              <button type="submit" className="btn btn-primary" style={{ minHeight: '40px' }}>
                프로젝트 생성
              </button>
            </form>
          </div>

          {/* Project List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>등록된 프로젝트 목록</div>
            {categories.filter(c => c.isProject).length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', paddingLeft: '4px' }}>등록된 프로젝트가 없습니다.</p>
            ) : (
              categories.filter(c => c.isProject).map(proj => (
                <div 
                  key={proj.id}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: proj.color }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{proj.name}</div>
                      {proj.description && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{proj.description}</div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setProjectToDelete(proj);
                      setShowDeleteConfirmModal(true);
                    }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    aria-label="Delete project"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ----------------- CATEGORIES TAB ----------------- */}
      {activeSettingsTab === 'category' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* New Category Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <Plus size={16} style={{ color: 'var(--accent-color)' }} />
              신규 카테고리 추가
            </h2>
            <form onSubmit={handleAddCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  className="text-input"
                  style={{ minHeight: '40px', padding: '10px', fontSize: '14px' }}
                  placeholder="카테고리명 (예: 개인일정)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                />
                
                {/* Horizontal Circle Color Grid Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>카테고리 색상 선택</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedCatColor(color)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: color,
                          border: selectedCatColor === color ? '2px solid var(--text-primary)' : '1px solid var(--border-color)',
                          cursor: 'pointer',
                          padding: 0,
                          boxShadow: selectedCatColor === color ? '0 0 8px var(--accent-color)' : 'none',
                          transform: selectedCatColor === color ? 'scale(1.1)' : 'scale(1)',
                          transition: 'all var(--transition-fast)'
                        }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-secondary" style={{ minHeight: '40px' }}>
                카테고리 추가
              </button>
            </form>
          </div>

          {/* Category List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>등록된 카테고리 목록</div>
            {categories.filter(c => !c.isProject).map(cat => (
              <div 
                key={cat.id}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: cat.color }} />
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>{cat.name}</span>
                  {cat.isSystem && (
                    <span style={{ fontSize: '10px', backgroundColor: 'var(--bg-active)', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Lock size={10} /> 시스템
                    </span>
                  )}
                </div>
                
                {cat.isSystem ? (
                  <span style={{ color: 'var(--text-muted)', padding: '4px' }}>
                    <Lock size={16} style={{ opacity: 0.5 }} />
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      if (confirm(`'${cat.name}' 카테고리를 삭제하시겠습니까?`)) {
                        onDeleteCategory(cat.id);
                        alert('삭제되었습니다.');
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    aria-label="Delete category"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------- SYSTEM & BACKUP TAB ----------------- */}
      {activeSettingsTab === 'system' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Notifications Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Bell size={18} style={{ color: 'var(--accent-color)' }} />
              일과 마감 알림
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
              오늘 완료하지 못한 일정이 있을 경우, 푸시 알림이나 브라우저 대화상자를 통해 리마인드 알림을 발송합니다.
            </p>
            <button 
              onClick={triggerMockNotification}
              className="btn btn-secondary"
              style={{ minHeight: '40px', fontSize: '13px' }}
            >
              알림 테스트 실행
            </button>
          </div>

          {/* Backup & Import Data */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <RefreshCw size={18} style={{ color: 'var(--accent-color)' }} />
              데이터 백업 및 불러오기
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
              등록된 모든 일정을 JSON 백업 파일로 저장하거나, 백업 파일로부터 복원할 수 있습니다.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button 
                onClick={handleExportData}
                className="btn btn-secondary"
                style={{ minHeight: '40px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
              >
                <Download size={16} />
                JSON 백업 내보내기
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
                style={{ minHeight: '40px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
              >
                <Upload size={16} />
                JSON 백업 불러오기
              </button>
            </div>
            
            <input 
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json"
              onChange={handleImportData}
            />
          </div>

          {/* PWA App Installation Info/Button */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              📱 모바일 앱 설치 (PWA)
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
              SoloFlow는 모바일 기기 홈 화면에 웹앱으로 설치하여 전체화면으로 더욱 편리하게 이용하실 수 있습니다.
            </p>
            {isInstallable ? (
              <button 
                onClick={onInstallClick}
                className="btn btn-primary"
                style={{ minHeight: '40px', fontSize: '13.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                앱 설치하기 (홈 화면에 추가)
              </button>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-app)', padding: '12px', borderRadius: 'var(--radius-sm)', lineHeight: '1.5' }}>
                💡 <strong>이미 설치되었거나 간편 설치 미지원 환경인가요?</strong>
                <ul style={{ paddingLeft: '16px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li><strong>iOS Safari</strong>: 공유 버튼(사각형에 위 화살표)을 누르고 <strong>[홈 화면에 추가]</strong>를 누르면 단독 앱으로 설치됩니다.</li>
                  <li><strong>Android Chrome</strong>: 메뉴 버튼(점 3개)을 누르고 <strong>[앱 설치]</strong> 또는 <strong>[홈 화면에 추가]</strong>를 선택하세요.</li>
                  <li>설치하지 않으셔도 언제든지 모바일 웹 브라우저를 통해 똑같이 이용하실 수 있습니다.</li>
                </ul>
              </div>
            )}
          </div>

          {/* User Account Settings */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <LogOut size={18} style={{ color: 'var(--accent-color)' }} />
              계정 설정
            </h2>
            {userEmail ? (
              <>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                  현재 로그인 계정: <strong>{userEmail}</strong>
                </p>
                <button 
                  onClick={onLogout}
                  className="btn btn-secondary"
                  style={{ minHeight: '40px', fontSize: '13px', backgroundColor: 'var(--bg-active)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                  현재 로그인되어 있지 않습니다. 회원가입/로그인하시면 클라우드에 일정이 안전하게 실시간으로 동기화됩니다.
                </p>
                <button 
                  onClick={onLoginClick}
                  className="btn btn-primary"
                  style={{ minHeight: '40px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  회원가입 / 로그인하기
                </button>
              </>
            )}
          </div>

          {/* Dangerous Zone */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderColor: '#ef4444' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', margin: 0 }}>
              <AlertTriangle size={18} />
              위험 구역 (초기화)
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
              어플리케이션에 저장된 모든 데이터(일정, 프로젝트, 설정 변수 등)를 영구 삭제하고 앱 초기 상태로 되돌립니다.
            </p>
            <button 
              onClick={() => {
                if (confirm('⚠️ 정말로 모든 데이터를 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 Supabase 데이터는 영향받지 않지만 로컬 상태가 전체 초기화됩니다.')) {
                  onClearAllData();
                  alert('모든 로컬 데이터가 초기화되었습니다.');
                }
              }}
              className="btn"
              style={{ minHeight: '40px', backgroundColor: '#ef4444', color: 'white', border: 'none' }}
            >
              전체 데이터 완전 초기화
            </button>
          </div>
        </div>
      )}

      {/* Project Deletion Custom Options Modal */}
      {showDeleteConfirmModal && projectToDelete && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div 
            className="card animate-scale-in" 
            style={{ 
              maxWidth: '400px', 
              margin: '20px', 
              padding: '24px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px' 
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', margin: 0 }}>
              <AlertTriangle size={20} />
              프로젝트 삭제 처리 선택
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
              '**{projectToDelete.name}**' 프로젝트를 어떻게 처리하시겠습니까? 
              <br />
              일반 카테고리로 강등 변경하면 기존에 프로젝트 전용으로 구성된 타임라인 목표(마일스톤)들이 모두 삭제됩니다.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <button 
                className="btn btn-secondary" 
                style={{ minHeight: '40px', fontWeight: 'bold' }}
                onClick={() => handleConfirmDeleteProject(true)}
              >
                📂 일반 카테고리로 변경 (목표선 제거)
              </button>
              <button 
                className="btn btn-primary" 
                style={{ minHeight: '40px', background: '#ef4444', border: 'none', fontWeight: 'bold' }}
                onClick={() => handleConfirmDeleteProject(false)}
              >
                🗑️ 영구히 완전 삭제 (카테고리 전체 제거)
              </button>
              <button 
                className="btn" 
                style={{ minHeight: '40px', background: 'var(--bg-active)', color: 'var(--text-primary)' }} 
                onClick={() => {
                  setProjectToDelete(null);
                  setShowDeleteConfirmModal(false);
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SettingsView;
