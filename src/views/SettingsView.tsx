import React, { useRef } from 'react';
import { Download, Upload, Trash2, Bell } from 'lucide-react';
import type { Task } from '../services/todoService';

interface SettingsViewProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  tasks: Task[];
  onImportData: (importedTasks: Task[]) => void;
  onClearAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  setTheme,
  tasks,
  onImportData,
  onClearAllData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toggle theme utility
  const handleThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTheme = e.target.checked ? 'dark' : 'light';
    setTheme(nextTheme);
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
          // Quick validation checking if tasks have 'id' and 'title'
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

  // Mock reminder triggers
  const triggerMockNotification = () => {
    const incompleteTasks = tasks.filter(t => t.status !== 'done' && !t.isWeeklyGoal);
    
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
          // Fallback simple dialog inside browser
          alert(`[SoloFlow 리마인더]\n오늘 미완료된 업무가 ${incompleteTasks.length}개 있습니다. 퇴근 전 확인하세요!`);
        }
      });
    } else {
      alert(`[SoloFlow 리마인더]\n오늘 미완료된 업무가 ${incompleteTasks.length}개 있습니다. 퇴근 전 확인하세요!`);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* View Header */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>설정</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
          SoloFlow 환경 및 데이터 백업을 설정합니다.
        </p>
      </div>

      {/* 1. Theme Configuration */}
      <div className="settings-section">
        <h2 className="settings-section-title">화면 및 테마</h2>
        <div className="settings-list">
          <div className="settings-row">
            <div>
              <div className="settings-row-label">다크 모드 기본 적용</div>
              <div className="settings-row-desc">어두운 화면으로 눈의 피로를 최소화합니다.</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={theme === 'dark'}
                onChange={handleThemeChange}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* 2. Notification Configuration */}
      <div className="settings-section">
        <h2 className="settings-section-title">알림 (리마인드)</h2>
        <div className="settings-list">
          <div className="settings-row">
            <div>
              <div className="settings-row-label">퇴근 전 미완료 업무 리마인드</div>
              <div className="settings-row-desc">매일 저녁 남은 할 일을 브라우저 푸시로 알려줍니다.</div>
            </div>
            <button
              onClick={triggerMockNotification}
              className="btn btn-secondary"
              style={{ minHeight: '38px', padding: '8px 12px', fontSize: '12px', display: 'flex', gap: '4px' }}
            >
              <Bell size={14} />
              테스트 알림
            </button>
          </div>
        </div>
      </div>

      {/* 3. Data Control */}
      <div className="settings-section">
        <h2 className="settings-section-title">데이터 관리</h2>
        <div className="settings-list">
          {/* Export JSON */}
          <div className="settings-row">
            <div>
              <div className="settings-row-label">데이터 백업 (내보내기)</div>
              <div className="settings-row-desc">현재 일정을 JSON 파일로 다운로드하여 백업합니다.</div>
            </div>
            <button
              onClick={handleExportData}
              className="btn btn-secondary"
              style={{ minHeight: '38px', padding: '8px 12px', fontSize: '12px', display: 'flex', gap: '6px' }}
            >
              <Download size={14} />
              백업
            </button>
          </div>

          {/* Import JSON */}
          <div className="settings-row">
            <div>
              <div className="settings-row-label">데이터 복원 (불러오기)</div>
              <div className="settings-row-desc">이전에 백업해 둔 JSON 파일을 불러와 복원합니다.</div>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".json"
                onChange={handleImportData}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
                style={{ minHeight: '38px', padding: '8px 12px', fontSize: '12px', display: 'flex', gap: '6px' }}
              >
                <Upload size={14} />
                복원
              </button>
            </div>
          </div>

          {/* Hard Reset */}
          <div className="settings-row" style={{ backgroundColor: 'rgba(239, 68, 68, 0.03)' }}>
            <div>
              <div className="settings-row-label" style={{ color: '#ef4444' }}>전체 데이터 초기화</div>
              <div className="settings-row-desc">카테고리 및 등록된 모든 일정을 완전히 영구 삭제합니다.</div>
            </div>
            <button
              onClick={() => {
                if (confirm('주의: 모든 할 일 및 카테고리 데이터가 완전히 파괴되며 되돌릴 수 없습니다.\n정말 초기화하시겠습니까?')) {
                  onClearAllData();
                  alert('데이터가 완전히 초기화되었습니다.');
                }
              }}
              className="btn"
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                minHeight: '38px',
                padding: '8px 12px',
                fontSize: '12px',
                display: 'flex',
                gap: '6px',
              }}
            >
              <Trash2 size={14} />
              초기화
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SettingsView;
