import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  FolderPlus,
  FileSpreadsheet,
  Image as ImageIcon,
  ChevronLeft,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Briefcase,
  X,
  Edit3
} from 'lucide-react';
import type { Category, Milestone } from '../services/categoryService';
import type { Task } from '../services/todoService';
import { getTodayString } from '../services/todoService';
import { categoryService } from '../services/categoryService';

interface CategoryViewProps {
  categories: Category[];
  tasks: Task[];
}

export const CategoryView: React.FC<CategoryViewProps> = ({
  categories,
  tasks,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  // Form States for New Milestone
  const [newMsTitle, setNewMsTitle] = useState('');
  const [newMsDate, setNewMsDate] = useState(getTodayString());
  const [newMsNote, setNewMsNote] = useState('');

  // Scanning simulation states
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<'csv' | 'image' | null>(null);

  // Custom Confirm Dialog States for overwrite vs append
  const [pendingMilestones, setPendingMilestones] = useState<Omit<Milestone, 'id' | 'completedAt'>[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const todayStr = getTodayString();

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

  // Handle saving pending milestones
  const savePendingMilestones = (append: boolean) => {
    if (!selectedProjectId || pendingMilestones.length === 0) return;

    const existing = currentProject?.milestones || [];
    let updatedMilestones: Milestone[] = [];

    const newMs: Milestone[] = pendingMilestones.map((item) => ({
      id: `ms-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: item.title,
      targetDate: item.targetDate,
      completedAt: null,
      note: item.note,
    }));

    if (append) {
      updatedMilestones = [...existing, ...newMs];
    } else {
      updatedMilestones = newMs;
    }

    // Sort by due date
    updatedMilestones.sort((a, b) => a.targetDate.localeCompare(b.targetDate));

    categoryService.updateCategoryMilestones(selectedProjectId, updatedMilestones);

    // Reset states
    setPendingMilestones([]);
    setShowConfirmModal(false);
    setShowUploadPanel(false);
    
    alert(`${append ? '기존 목표에 추가' : '기존 목표 삭제 후 새롭게'} 등록이 완료되었습니다.`);
    window.location.reload(); // Simple reload to refresh top-level states
  };

  // Milestone manual additions
  const handleAddMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !newMsTitle.trim()) return;

    const newMsItem = {
      title: newMsTitle.trim(),
      targetDate: newMsDate,
      note: newMsNote.trim(),
    };

    const currentMilestones = currentProject?.milestones || [];

    if (currentMilestones.length > 0) {
      setPendingMilestones([newMsItem]);
      setShowConfirmModal(true);
    } else {
      categoryService.addMilestone(selectedProjectId, newMsItem.title, newMsItem.targetDate, newMsItem.note);
      setNewMsTitle('');
      setNewMsNote('');
      setNewMsDate(getTodayString());
      setShowUploadPanel(false);
      window.location.reload();
    }
  };

  // Delete Milestone
  const handleDeleteMilestone = (milestoneId: string) => {
    if (!selectedProjectId) return;
    if (confirm('이 목표 단계를 삭제하시겠습니까?')) {
      categoryService.deleteMilestone(selectedProjectId, milestoneId);
      window.location.reload();
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
            const currentMilestones = currentProject?.milestones || [];
            if (currentMilestones.length > 0) {
              setPendingMilestones(parsed);
              setShowConfirmModal(true);
            } else {
              parsed.forEach((item) => {
                categoryService.addMilestone(selectedProjectId, item.title, item.targetDate, item.note);
              });
              alert(`엑셀(CSV)에서 ${parsed.length}개의 목표가 성공적으로 등록되었습니다.`);
              setShowUploadPanel(false);
              window.location.reload();
            }
          }
        } catch (err) {
          alert('CSV 파일을 읽는 중 오류가 발생했습니다.');
        } finally {
          setIsScanning(false);
          setScanType(null);
        }
      }, 1000);
    };
    reader.readAsText(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedProjectId) return;

    setIsScanning(true);
    setScanType('image');

    setTimeout(() => {
      const mockMilestones = categoryService.generateMockMilestonesFromImage();
      const currentMilestones = currentProject?.milestones || [];

      setIsScanning(false);
      setScanType(null);

      if (currentMilestones.length > 0) {
        setPendingMilestones(mockMilestones);
        setShowConfirmModal(true);
      } else {
        mockMilestones.forEach((item) => {
          categoryService.addMilestone(selectedProjectId, item.title, item.targetDate, item.note);
        });
        alert('📷 이미지 마일스톤 분석 완료!\n일정표 이미지 속 날짜와 키워드를 기반으로 5개의 단계별 타임라인이 자동 생성되었습니다.');
        setShowUploadPanel(false);
        window.location.reload();
      }
    }, 2000);
  };

  // --- Plan vs Actual Calculation helper ---
  const calculateMilestoneStatus = (milestone: Milestone, relatedTasks: Task[]) => {
    const doneTasks = relatedTasks.filter(t => t.status === 'done');
    const isCompleted = relatedTasks.length > 0 && doneTasks.length === relatedTasks.length;

    if (isCompleted) {
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
    
    const milestoneComparisons = milestonesList.map(ms => {
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
          onClick={() => setSelectedProjectId(null)}
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
        <div className="stat-banner" style={{ paddingLeft: '18px' }}>
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 className="stat-banner-title" style={{ margin: 0 }}>{currentProject.name} 타임라인</h1>
            <button
              onClick={() => setShowUploadPanel(true)}
              className="btn btn-primary"
              style={{ 
                minHeight: '32px', 
                padding: '4px 12px',
                fontSize: '12px',
                background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 'bold',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <Edit3 size={12} />
              {milestonesList.length > 0 ? '목표 수정' : '목표 관리'}
            </button>
          </div>

          {currentProject.description && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', marginBottom: 0 }}>
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

        {/* 1. Modal/Panel for adding timeline targets (CSV, Image OCR, Manual Form) */}
        {showUploadPanel && (
          <div className="modal-overlay" onClick={() => setShowUploadPanel(false)}>
            <div 
              className="card animate-scale-in" 
              style={{ 
                maxWidth: '460px', 
                width: '90%', 
                margin: '20px', 
                padding: '20px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <FolderPlus size={18} style={{ color: 'var(--accent-color)' }} />
                  목표 설정 및 스캔
                </h2>
                <button 
                  onClick={() => setShowUploadPanel(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* CSV Excel Parser */}
                <label className="file-upload-zone" style={{ padding: '16px 8px' }}>
                  <input 
                    type="file" 
                    accept=".csv" 
                    style={{ display: 'none' }} 
                    onChange={handleCSVUpload}
                    disabled={isScanning}
                  />
                  <FileSpreadsheet size={24} style={{ color: '#10b981' }} />
                  <div className="file-upload-title" style={{ fontSize: '12px' }}>엑셀 (CSV) 등록</div>
                  <div className="file-upload-subtitle" style={{ fontSize: '10px' }}>단계,날짜,메모 포맷</div>
                </label>

                {/* Image OCR Simulator */}
                <label className="file-upload-zone" style={{ padding: '16px 8px' }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleImageUpload}
                    disabled={isScanning}
                  />
                  <ImageIcon size={24} style={{ color: '#8b5cf6' }} />
                  <div className="file-upload-title" style={{ fontSize: '12px' }}>이미지 일정 스캔</div>
                  <div className="file-upload-subtitle" style={{ fontSize: '10px' }}>스케줄 캡쳐 자동인식</div>
                </label>
              </div>

              {isScanning && (
                <div className="scan-loading-container">
                  <div className="scan-image-placeholder">
                    <ImageIcon size={32} />
                    <div className="scanner-laser-line" />
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-color)', animation: 'pulse 1.5s infinite' }}>
                    {scanType === 'csv' ? 'CSV 엑셀 스프레드시트 분석 중...' : '스케줄 일정표 이미지 스캔 분석 중...'}
                  </div>
                </div>
              )}

              <div style={{ height: '1px', backgroundColor: 'var(--border-color)' }} />

              {/* Manual Milestone Form */}
              <form onSubmit={handleAddMilestoneSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>수동 목표 단계 추가</div>
                <input
                  type="text"
                  className="text-input"
                  style={{ minHeight: '40px', padding: '10px', fontSize: '14px' }}
                  placeholder="예: 1차 베타 빌드 배포"
                  value={newMsTitle}
                  onChange={(e) => setNewMsTitle(e.target.value)}
                  required
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="date"
                    className="date-input"
                    style={{ minHeight: '40px', padding: '8px' }}
                    value={newMsDate}
                    onChange={(e) => setNewMsDate(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="text-input"
                    style={{ minHeight: '40px', padding: '10px', fontSize: '14px' }}
                    placeholder="목표 설명 메모 (선택)"
                    value={newMsNote}
                    onChange={(e) => setNewMsNote(e.target.value)}
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn-secondary" 
                  style={{ minHeight: '40px', display: 'flex', gap: '6px', justifyContent: 'center' }}
                >
                  <Plus size={16} />
                  목표선 등록
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Overwrite vs Append Custom Modal Dialog */}
        {showConfirmModal && (
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
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
                이미 등록된 목표가 있습니다
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                기존에 등록되어 있는 프로젝트 목표들을 모두 **삭제**하고 새 목표로 덮어쓰시겠습니까? 아니면 기존 목표를 유지한 채 **추가**하시겠습니까?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ minHeight: '40px', background: '#ef4444' }}
                  onClick={() => savePendingMilestones(false)}
                >
                  🗑️ 기존 목표 삭제 후 새로 등록
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ minHeight: '40px' }}
                  onClick={() => savePendingMilestones(true)}
                >
                  ➕ 기존 목표에 추가
                </button>
                <button 
                  className="btn" 
                  style={{ minHeight: '40px', background: 'var(--bg-active)', color: 'var(--text-primary)' }} 
                  onClick={() => {
                    setPendingMilestones([]);
                    setShowConfirmModal(false);
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Timeline comparison render */}
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Plan(목표일) vs Actual(실제완료) 타임라인
          </h2>

          {milestoneComparisons.length === 0 ? (
            <div className="empty-state" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <Calendar size={44} className="empty-state-icon" />
              <h3 className="empty-state-title">형성된 목표 타임라인이 없습니다</h3>
              <p className="empty-state-desc">프로젝트 상세 프로필의 [목표 관리] 버튼을 눌러 목표 일정을 생성하세요.</p>
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
  // Main view render: Projects List ("프로젝트별 타임라인 목표가 우선 보여짐")
  // ---------------------------------------------------------------------------
  const projectList = categories.filter(c => c.isProject);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>목표관리</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          프로젝트별로 설정된 단계 목표(마일스톤)와 실행 타임라인을 관리합니다.
        </p>
      </div>

      {/* List projects */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
        {projectList.length === 0 ? (
          <div className="empty-state">
            <Briefcase size={44} className="empty-state-icon" />
            <h3 className="empty-state-title">등록된 프로젝트가 없습니다</h3>
            <p className="empty-state-desc">우측 하단의 [설정] 탭으로 이동하여 새 비즈니스 프로젝트를 등록해 보세요.</p>
          </div>
        ) : (
          projectList.map(proj => {
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
  );
};
export default CategoryView;
