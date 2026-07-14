import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Lock,
  FolderPlus,
  FileSpreadsheet,
  Image as ImageIcon,
  ChevronLeft,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Briefcase
} from 'lucide-react';
import type { Category, Milestone } from '../services/categoryService';
import type { Task } from '../services/todoService';
import { getTodayString } from '../services/todoService';
import { categoryService } from '../services/categoryService';

interface CategoryViewProps {
  categories: Category[];
  tasks: Task[];
  onAddCategory: (name: string, color: string, isProject?: boolean, description?: string) => void;
  onDeleteCategory: (id: string) => void;
}

export const CategoryView: React.FC<CategoryViewProps> = ({
  categories,
  tasks,
  onAddCategory,
  onDeleteCategory,
}) => {
  // Navigation & Tab States
  const [activeSubTab, setActiveSubTab] = useState<'category' | 'project'>('project');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Form States for New Category/Project
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [isProjectMode, setIsProjectMode] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#3b82f6');

  // Form States for New Milestone
  const [newMsTitle, setNewMsTitle] = useState('');
  const [newMsDate, setNewMsDate] = useState(getTodayString());
  const [newMsNote, setNewMsNote] = useState('');

  // Scanning simulation states
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<'csv' | 'image' | null>(null);

  const todayStr = getTodayString();

  // Color options
  const COLOR_PRESETS = [
    '#3b82f6', '#10b981', '#ef4444', '#ec4899',
    '#f59e0b', '#8b5cf6', '#14b8a6', '#f97316',
    '#06b6d4', '#84cc16', '#a855f7', '#6b7280',
  ];

  // Pick selected project detail
  const currentProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return categories.find((c) => c.id === selectedProjectId) || null;
  }, [categories, selectedProjectId]);

  // Compute tasks matching current project
  const projectTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return tasks.filter((t) => t.category === selectedProjectId);
  }, [tasks, selectedProjectId]);

  // Category Addition Form Submit
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    if (categories.some((c) => c.name.trim() === newCatName.trim())) {
      alert('이미 존재하는 카테고리 이름입니다.');
      return;
    }

    onAddCategory(newCatName.trim(), selectedColor, isProjectMode, newCatDesc.trim());
    setNewCatName('');
    setNewCatDesc('');
    setIsProjectMode(false);
    
    // Auto color switch
    const nextIdx = (COLOR_PRESETS.indexOf(selectedColor) + 1) % COLOR_PRESETS.length;
    setSelectedColor(COLOR_PRESETS[nextIdx]);
  };

  // Switch project setting mode (turn category to project or vice-versa)
  const handleToggleProjectSetting = (id: string, activate: boolean) => {
    categoryService.toggleProjectMode(id, activate);
    // Reload category arrays inside App via direct localstore callbacks
    window.location.reload(); // Simple reload to refresh top-level states
  };

  // Milestone manual additions
  const handleAddMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !newMsTitle.trim()) return;

    categoryService.addMilestone(selectedProjectId, newMsTitle.trim(), newMsDate, newMsNote.trim());
    setNewMsTitle('');
    setNewMsNote('');
    setNewMsDate(getTodayString());
  };

  // Delete Milestone
  const handleDeleteMilestone = (milestoneId: string) => {
    if (!selectedProjectId) return;
    if (confirm('이 목표 단계를 삭제하시겠습니까?')) {
      categoryService.deleteMilestone(selectedProjectId, milestoneId);
      // Force render refresh by updating selectedProject details
    }
  };

  // --- CSV parsing & Mock Image processing triggers ---

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedProjectId) return;

    const file = files[0];
    const reader = new FileReader();
    
    setIsScanning(true);
    setScanType('csv');

    reader.onload = (evt) => {
      setTimeout(() => {
        try {
          const csvText = evt.target?.result as string;
          const parsed = categoryService.parseCSVToMilestones(csvText);
          
          if (parsed.length === 0) {
            alert('파싱 가능한 마일스톤 데이터가 없습니다.');
          } else {
            parsed.forEach((item) => {
              categoryService.addMilestone(selectedProjectId, item.title, item.targetDate, item.note);
            });
            alert(`엑셀(CSV)에서 ${parsed.length}개의 목표가 성공적으로 타임라인에 등록되었습니다.`);
          }
        } catch (err) {
          alert('CSV 파일을 읽는 중 오류가 발생했습니다.');
        } finally {
          setIsScanning(false);
          setScanType(null);
        }
      }, 1000); // 1s simulation wait
    };
    reader.readAsText(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedProjectId) return;

    setIsScanning(true);
    setScanType('image');

    // Simulate 2 seconds AI analysis time
    setTimeout(() => {
      const mockMilestones = categoryService.generateMockMilestonesFromImage();
      mockMilestones.forEach((item) => {
        categoryService.addMilestone(selectedProjectId, item.title, item.targetDate, item.note);
      });
      setIsScanning(false);
      setScanType(null);
      alert('📷 이미지 마일스톤 분석 완료!\n일정표 이미지 속 날짜와 키워드를 기반으로 5개의 단계별 타임라인이 자동 생성되었습니다.');
    }, 2000);
  };

  // --- Plan vs Actual Calculation helper ---
  const calculateMilestoneStatus = (milestone: Milestone, relatedTasks: Task[]) => {
    const doneTasks = relatedTasks.filter(t => t.status === 'done');
    const isCompleted = relatedTasks.length > 0 && doneTasks.length === relatedTasks.length;

    if (isCompleted) {
      // Find latest completed date
      let latestCompletedDate = '';
      doneTasks.forEach(t => {
        if (t.completedAt) {
          const compDate = t.completedAt.split('T')[0];
          if (!latestCompletedDate || compDate > latestCompletedDate) {
            latestCompletedDate = compDate;
          }
        }
      });

      const actualCompletion = latestCompletedDate || todayStr;
      const isDelayed = actualCompletion > milestone.targetDate;

      return {
        status: isDelayed ? 'delayed' as const : 'completed' as const,
        label: isDelayed ? '지연 완료' : '완료 (일정 준수)',
        actualDate: actualCompletion,
        badgeClass: isDelayed ? 'delayed' : 'completed',
        icon: <CheckCircle2 size={14} />
      };
    } else {
      // Pending
      const isPastTarget = todayStr > milestone.targetDate;
      const hasHighPriorityTodo = relatedTasks.some(t => t.priority === 'high' && t.status !== 'done');

      return {
        status: isPastTarget ? 'delayed' as const : (hasHighPriorityTodo ? 'warning' as const : 'pending' as const),
        label: isPastTarget ? '지연 지체중' : (hasHighPriorityTodo ? '지연 위험' : '대기 중'),
        actualDate: null,
        badgeClass: isPastTarget ? 'delayed' : (hasHighPriorityTodo ? 'warning' : 'pending'),
        icon: isPastTarget ? <AlertTriangle size={14} /> : <Clock size={14} />
      };
    }
  };

  // ---------------------------------------------------------------------------
  // Sub-View: Project detail display
  // ---------------------------------------------------------------------------
  if (selectedProjectId && currentProject) {
    const milestonesList = currentProject.milestones || [];
    
    // Group tasks per milestone date for mapping
    const milestoneComparisons = milestonesList.map(ms => {
      // Match tasks that are due on this milestone target date
      const matchedTasks = projectTasks.filter(t => t.dueDate === ms.targetDate);
      const evaluation = calculateMilestoneStatus(ms, matchedTasks);

      return {
        milestone: ms,
        tasks: matchedTasks,
        evaluation,
      };
    });

    const projectCompletionRate = (() => {
      if (projectTasks.length === 0) return 0;
      const completed = projectTasks.filter(t => t.status === 'done').length;
      return Math.round((completed / projectTasks.length) * 100);
    })();

    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Back navigation header */}
        <button
          onClick={() => {
            setSelectedProjectId(null);
            // Quick workaround to update App state if reload occurred
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--accent-color)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            alignSelf: 'flex-start',
            padding: '4px 0'
          }}
        >
          <ChevronLeft size={18} />
          프로젝트 목록으로 돌아가기
        </button>

        {/* Project Profile banner */}
        <div 
          className="stat-banner"
          style={{ paddingLeft: '18px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Project Timeline
            </span>
            <span 
              className="badge" 
              style={{ backgroundColor: currentProject.color, color: 'white' }}
            >
              {currentProject.name}
            </span>
          </div>
          <h1 className="stat-banner-title">{currentProject.name} 타임라인</h1>
          {currentProject.description && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {currentProject.description}
            </p>
          )}

          <div className="stat-progress-container" style={{ marginTop: '14px' }}>
            <div className="stat-progress-bar-bg">
              <div
                className="stat-progress-bar-fill"
                style={{ width: `${projectCompletionRate}%`, backgroundColor: currentProject.color }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="stat-progress-text">종합 태스크 완료율 {projectCompletionRate}%</span>
              <span className="stat-progress-text">진행 {projectTasks.filter(t => t.status !== 'done').length}개 / 완료 {projectTasks.filter(t => t.status === 'done').length}개</span>
            </div>
          </div>
        </div>

        {/* 1. Add timeline targets (Manual, Excel, Image OCR) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderPlus size={18} style={{ color: 'var(--accent-color)' }} />
            목표 일정 및 파일 업로드
          </h2>
          
          {/* File Upload Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* CSV Excel Parser */}
            <label className="file-upload-zone">
              <input 
                type="file" 
                accept=".csv" 
                style={{ display: 'none' }} 
                onChange={handleCSVUpload}
                disabled={isScanning}
              />
              <FileSpreadsheet size={24} style={{ color: '#10b981' }} />
              <div className="file-upload-title">엑셀 (CSV) 등록</div>
              <div className="file-upload-subtitle">단계,날짜,메모 포맷</div>
            </label>

            {/* Image OCR Simulator */}
            <label className="file-upload-zone">
              <input 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleImageUpload}
                disabled={isScanning}
              />
              <ImageIcon size={24} style={{ color: '#8b5cf6' }} />
              <div className="file-upload-title">이미지 일정 스캔</div>
              <div className="file-upload-subtitle">스케줄 캡쳐 자동인식</div>
            </label>
          </div>

          {/* Laser Scanner animation indicator */}
          {isScanning && (
            <div className="scan-loading-container">
              <div className="scan-image-placeholder">
                <ImageIcon size={38} />
                <div className="scanner-laser-line" />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-color)', animation: 'pulse 1.5s infinite' }}>
                {scanType === 'csv' ? 'CSV 엑셀 스프레드시트 분석 중...' : '스케줄 일정표 이미지 스캔 분석 중...'}
              </div>
            </div>
          )}

          {/* Divider */}
          <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />

          {/* Manual Milestone Form */}
          <form onSubmit={handleAddMilestoneSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>수동 목표 단계 생성</div>
            <input
              type="text"
              className="text-input"
              style={{ minHeight: '40px', padding: '10px', fontSize: '14px' }}
              placeholder="예: 1차 베타 빌드 배포"
              value={newMsTitle}
              onChange={(e) => setNewMsTitle(e.target.value)}
              required
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="date"
                className="date-input"
                style={{ flex: 1, minHeight: '40px', padding: '8px' }}
                value={newMsDate}
                onChange={(e) => setNewMsDate(e.target.value)}
                required
              />
              <input
                type="text"
                className="text-input"
                style={{ flex: 1.5, minHeight: '40px', padding: '10px', fontSize: '14px' }}
                placeholder="목표 설명 메모 (선택)"
                value={newMsNote}
                onChange={(e) => setNewMsNote(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-secondary" 
              style={{ minHeight: '40px', display: 'flex', gap: '6px' }}
            >
              <Plus size={16} />
              목표선 추가
            </button>
          </form>
        </div>

        {/* 2. Timeline comparison render */}
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Plan(목표일) vs Actual(실제완료) 타임라인
          </h2>

          {milestoneComparisons.length === 0 ? (
            <div className="empty-state" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <Calendar size={44} className="empty-state-icon" />
              <h3 className="empty-state-title">형성된 목표 타임라인이 없습니다</h3>
              <p className="empty-state-desc">파일을 업로드하거나 수동으로 마일스톤 목표를 추가해 보세요.</p>
            </div>
          ) : (
            <div className="vertical-timeline">
              {milestoneComparisons.map(({ milestone, tasks: msTasks, evaluation }) => (
                <div 
                  key={milestone.id} 
                  className={`timeline-node-container ${evaluation.badgeClass}`}
                >
                  <div className="timeline-node-dot" />
                  
                  <div className="timeline-node-card">
                    {/* Node Header */}
                    <div className="timeline-node-header">
                      <div className="timeline-node-title">{milestone.title}</div>
                      
                      <button
                        onClick={() => handleDeleteMilestone(milestone.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          opacity: 0.6,
                          cursor: 'pointer',
                          padding: '2px'
                        }}
                        aria-label="Delete milestone"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {milestone.note && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                        {milestone.note}
                      </p>
                    )}

                    {/* Timeline Plan vs Actual dates compares */}
                    <div className="timeline-dates-box">
                      <div className="timeline-date-row">
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Plan (목표 마감):</span>
                        <span style={{ fontWeight: 700 }}>{milestone.targetDate}</span>
                      </div>
                      <div className="timeline-date-row">
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Actual (실제 마감):</span>
                        {evaluation.actualDate ? (
                          <span style={{ color: evaluation.status === 'delayed' ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                            {evaluation.actualDate}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            미완료 (진행 중)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Evaluation Badge and task list count */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span className={`badge-timeline ${evaluation.badgeClass}`}>
                        {evaluation.icon}
                        {evaluation.label}
                      </span>

                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        세부 일정: {msTasks.filter(t => t.status === 'done').length}/{msTasks.length}개 완료
                      </span>
                    </div>

                    {/* Simple task mapping rows */}
                    {msTasks.length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                        {msTasks.map(t => (
                          <div 
                            key={t.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              fontSize: '11.5px',
                              color: t.status === 'done' ? 'var(--text-muted)' : 'var(--text-secondary)',
                              textDecoration: t.status === 'done' ? 'line-through' : 'none'
                            }}
                          >
                            <span 
                              style={{ 
                                width: '6px', 
                                height: '6px', 
                                borderRadius: '50%', 
                                backgroundColor: t.status === 'done' ? 'var(--text-muted)' : 'var(--accent-color)' 
                              }} 
                            />
                            {t.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main view render: Category / Project List Switcher
  // ---------------------------------------------------------------------------
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Subtab selection headers */}
      <div className="project-tabs-container">
        <button
          className={`project-tab-btn ${activeSubTab === 'project' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('project')}
        >
          💼 프로젝트 타임라인
        </button>
        <button
          className={`project-tab-btn ${activeSubTab === 'category' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('category')}
        >
          📂 기본 카테고리 관리
        </button>
      </div>

      {/* ----------------- PROJECTS MANAGEMENT TAB ----------------- */}
      {activeSubTab === 'project' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>프로젝트 관리</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              비즈니스 프로젝트별 마일스톤 및 타임라인을 관리합니다.
            </p>
          </div>

          {/* Quick Creator banner for category -> project upgrade */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700 }}>신규 프로젝트 추가</h2>
            <form onSubmit={handleAddCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="text-input"
                  style={{ flex: 1, minHeight: '40px', padding: '10px', fontSize: '14px' }}
                  placeholder="프로젝트명 (예: 유튜브 채널 브랜딩)"
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    setIsProjectMode(true); // Default to true here
                  }}
                  required
                />
                
                <select
                  className="select-input"
                  style={{ minHeight: '40px', padding: '8px', fontSize: '14px' }}
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                >
                  {COLOR_PRESETS.map(color => (
                    <option key={color} value={color} style={{ color }}>
                      색상
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                className="text-input"
                style={{ minHeight: '40px', padding: '10px', fontSize: '14px' }}
                placeholder="프로젝트 상세 설명 요약"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
              />

              <button type="submit" className="btn btn-primary" style={{ minHeight: '40px' }}>
                프로젝트 생성
              </button>
            </form>
          </div>

          {/* List projects */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {categories.filter(c => c.isProject).length === 0 ? (
              <div className="empty-state">
                <Briefcase size={44} className="empty-state-icon" />
                <h3 className="empty-state-title">활성화된 프로젝트가 없습니다</h3>
                <p className="empty-state-desc">위 폼에서 신규 프로젝트를 생성하거나, 아래 '기본 카테고리' 관리 탭에서 기존 카테고리를 프로젝트로 승격시켜 보세요.</p>
              </div>
            ) : (
              categories.filter(c => c.isProject).map(proj => {
                const totalProjTasks = tasks.filter(t => t.category === proj.id);
                const completedProjTasks = totalProjTasks.filter(t => t.status === 'done').length;
                const progress = totalProjTasks.length > 0 ? Math.round((completedProjTasks / totalProjTasks.length) * 100) : 0;
                const milestonesCount = proj.milestones?.length || 0;

                return (
                  <div 
                    key={proj.id} 
                    className="project-card"
                    onClick={() => setSelectedProjectId(proj.id)}
                  >
                    <div className="project-card-header">
                      <div className="project-card-title">
                        <Briefcase size={18} style={{ color: proj.color }} />
                        {proj.name}
                      </div>
                      <span className="badge" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        목표 {milestonesCount}개
                      </span>
                    </div>

                    {proj.description && (
                      <p className="project-card-desc">{proj.description}</p>
                    )}

                    <div className="stat-progress-container" style={{ marginTop: '10px' }}>
                      <div className="stat-progress-bar-bg">
                        <div
                          className="stat-progress-bar-fill"
                          style={{ width: `${progress}%`, backgroundColor: proj.color }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>업무 진행률 {progress}%</span>
                        <span>완료 {completedProjTasks} / 총 {totalProjTasks.length}개</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ----------------- BASE CATEGORIES MANAGEMENT TAB ----------------- */}
      {activeSubTab === 'category' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>일반 카테고리 관리</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              일정 등록 시 분류할 카테고리를 설정하며, 원할 시 프로젝트(목표 타임라인 설정 가능)로 승격할 수 있습니다.
            </p>
          </div>

          {/* Quick form */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700 }}>새 카테고리 추가</h2>
            <form onSubmit={handleAddCategorySubmit} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="text-input"
                style={{ flex: 1, minHeight: '40px', padding: '10px', fontSize: '14px' }}
                placeholder="카테고리명 입력"
                value={newCatName}
                onChange={(e) => {
                  setNewCatName(e.target.value);
                  setIsProjectMode(false);
                }}
                required
              />
              
              <select
                className="select-input"
                style={{ minHeight: '40px', padding: '8px', fontSize: '14px' }}
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
              >
                {COLOR_PRESETS.map(color => (
                  <option key={color} value={color} style={{ color }}>
                    색상
                  </option>
                ))}
              </select>

              <button type="submit" className="btn btn-primary" style={{ minHeight: '40px', padding: '8px 14px' }}>
                추가
              </button>
            </form>
          </div>

          {/* List */}
          <div className="category-list">
            {categories.map((cat) => {
              const activeCount = tasks.filter(t => t.category === cat.id && t.status !== 'done').length;

              return (
                <div key={cat.id} className="category-item" style={{ paddingLeft: '12px' }}>
                  <div className="category-item-info">
                    <div>
                      <div className="category-name">{cat.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        진행 중 {activeCount}개 · {cat.isProject ? '💼 프로젝트 모드 활성' : '📂 일반 카테고리'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Project Promotion / Demotion button */}
                    <button
                      onClick={() => handleToggleProjectSetting(cat.id, !cat.isProject)}
                      className="btn"
                      style={{
                        minHeight: '32px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        backgroundColor: cat.isProject ? 'var(--accent-light)' : 'var(--bg-surface)',
                        color: cat.isProject ? 'var(--accent-color)' : 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        fontWeight: 'bold'
                      }}
                    >
                      {cat.isProject ? '프로젝트 해제' : '프로젝트로 지정'}
                    </button>

                    {cat.isSystem ? (
                      <span 
                        style={{ 
                          color: 'var(--text-muted)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: 'var(--bg-surface)',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <Lock size={12} />
                        기본
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          if (confirm(`'${cat.name}' 카테고리를 삭제하시겠습니까?\n이 카테고리로 지정된 일정들은 해제됩니다.`)) {
                            onDeleteCategory(cat.id);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          opacity: 0.8,
                          cursor: 'pointer',
                          padding: '8px'
                        }}
                        aria-label={`Delete ${cat.name}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
export default CategoryView;
