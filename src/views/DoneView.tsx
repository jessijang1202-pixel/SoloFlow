import React, { useMemo } from 'react';
import { Trash2, RotateCcw, Award, CheckCircle, BarChart2 } from 'lucide-react';
import { getTodayString } from '../services/todoService';
import type { Task } from '../services/todoService';
import type { Category } from '../services/categoryService';

interface DoneViewProps {
  tasks: Task[];
  categories: Category[];
  onToggleTask: (id: string) => void; // Restores the task
  onDeleteTask: (id: string) => void;
  onClearAllDone: () => void;
}

export const DoneView: React.FC<DoneViewProps> = ({
  tasks,
  categories,
  onToggleTask,
  onDeleteTask,
  onClearAllDone,
}) => {
  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  const todayStr = getTodayString();

  // 1. Group completed tasks by completion date (descending)
  const groupedDoneTasks = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'done');
    
    // Sort completed tasks by completedAt date descending
    completed.sort((a, b) => {
      const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return bTime - aTime;
    });

    const groups: { [key: string]: Task[] } = {};
    completed.forEach((task) => {
      if (task.completedAt) {
        // Group by local date string
        const dateObj = new Date(task.completedAt);
        const groupKey = dateObj.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        });
        
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(task);
      }
    });

    return Object.entries(groups);
  }, [tasks]);

  // 2. Compute statistics
  const stats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'done');
    const total = tasks.length;
    
    // Today stats
    const todayTasks = tasks.filter(t => t.dueDate === todayStr && !t.isWeeklyGoal);
    const todayDone = todayTasks.filter(t => t.status === 'done').length;
    const todayTotal = todayTasks.length;
    const todayRate = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

    return {
      totalDone: completed.length,
      lifetimeTotal: total,
      todayDone,
      todayTotal,
      todayRate,
    };
  }, [tasks, todayStr]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>완료 보관함</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            완료된 업무 내역과 통계를 확인합니다.
          </p>
        </div>
        {stats.totalDone > 0 && (
          <button
            onClick={() => {
              if (confirm('완료 보관함의 모든 일정을 영구적으로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
                onClearAllDone();
              }
            }}
            className="btn btn-text-danger"
            style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', padding: '8px' }}
          >
            <Trash2 size={14} />
            전체 비우기
          </button>
        )}
      </div>

      {/* 1. Statistics Cards */}
      <div className="done-summary">
        <div className="done-stat-card">
          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--accent-color)', marginBottom: '4px' }}>
            <Award size={20} />
          </div>
          <div className="done-stat-label">누적 완료</div>
          <div className="done-stat-value">{stats.totalDone}개</div>
        </div>

        <div className="done-stat-card">
          <div style={{ display: 'flex', justifyContent: 'center', color: '#10b981', marginBottom: '4px' }}>
            <BarChart2 size={20} />
          </div>
          <div className="done-stat-label">오늘 완료율</div>
          <div className="done-stat-value">{stats.todayRate}%</div>
        </div>
      </div>

      {/* 2. Grouped Completed Task List */}
      <div>
        <h2 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={16} />
          완료된 일정 목록
        </h2>

        {groupedDoneTasks.length === 0 ? (
          <div className="empty-state" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <Award size={48} className="empty-state-icon" />
            <h3 className="empty-state-title">아직 완료된 업무가 없습니다</h3>
            <p className="empty-state-desc">오늘 할 일을 끝마치고 체크박스를 눌러 완료 상태로 만들어 보세요.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {groupedDoneTasks.map(([dateKey, items]) => (
              <div key={dateKey}>
                <div 
                  style={{ 
                    fontSize: '13px', 
                    fontWeight: 700, 
                    color: 'var(--text-secondary)', 
                    marginBottom: '8px',
                    paddingLeft: '4px',
                    lineHeight: '1.2'
                  }}
                >
                  {dateKey}
                </div>
                
                <div className="todo-list">
                  {items.map((task) => {
                    const cat = categoryMap.get(task.category);
                    return (
                      <div
                        key={task.id}
                        className="todo-item done"
                      >
                        {/* Done status icon */}
                        <div className="todo-item-check">
                          <button
                            className="custom-checkbox"
                            style={{ borderColor: 'var(--accent-color)', backgroundColor: 'var(--accent-color)', color: 'white' }}
                            onClick={() => onToggleTask(task.id)}
                            aria-label="Restore task"
                          >
                            ✓
                          </button>
                        </div>

                        {/* Title and Category */}
                        <div className="todo-item-body">
                          <div className="todo-item-title">{task.title}</div>
                          <div className="todo-item-tags">
                            <span className="category-tag">{cat?.name || '기타'}</span>
                            {task.rolledOverFrom && (
                              <span className="rollover-badge" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                                이월 완료
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Restore / Delete actions */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => onToggleTask(task.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--accent-color)',
                              padding: '8px',
                              cursor: 'pointer',
                            }}
                            title="복원하기"
                            aria-label="Restore"
                          >
                            <RotateCcw size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('이 완료된 일정을 영구적으로 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.')) {
                                onDeleteTask(task.id);
                              }
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              padding: '8px',
                              cursor: 'pointer',
                            }}
                            title="영구 삭제"
                            aria-label="Delete permanently"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default DoneView;
