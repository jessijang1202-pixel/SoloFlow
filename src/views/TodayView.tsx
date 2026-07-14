import React, { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { getTodayString, sortTasks } from '../services/todoService';
import type { Task } from '../services/todoService';
import type { Category } from '../services/categoryService';

interface TodayViewProps {
  tasks: Task[];
  categories: Category[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onMoveTask: (id: string, direction: 'up' | 'down') => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  tasks,
  categories,
  onToggleTask,
  onDeleteTask,
  onMoveTask,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const todayStr = getTodayString();

  // Convert categories map for fast lookup
  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Filter tasks that are due today or are weekly goals that are still todo
  const todayTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Regular tasks due today (includes rollover tasks since their dueDate is updated to today)
      const isDueToday = task.dueDate === todayStr && !task.isWeeklyGoal;
      // 2. We only show incomplete tasks on the main list
      return isDueToday && task.status !== 'done';
    });
  }, [tasks, todayStr]);

  // Compute stats
  const rolloverCount = useMemo(() => {
    return todayTasks.filter((t) => t.status === 'rollover').length;
  }, [todayTasks]);

  const completedTodayCount = useMemo(() => {
    // Count how many tasks due today are completed
    return tasks.filter((task) => task.dueDate === todayStr && !task.isWeeklyGoal && task.status === 'done').length;
  }, [tasks, todayStr]);

  const totalTodayCount = todayTasks.length + completedTodayCount;

  const progressPercent = useMemo(() => {
    if (totalTodayCount === 0) return 0;
    return Math.round((completedTodayCount / totalTodayCount) * 100);
  }, [completedTodayCount, totalTodayCount]);

  // Filter based on selected category chip
  const filteredTasks = useMemo(() => {
    let list = todayTasks;
    if (selectedCategory !== 'all') {
      list = list.filter((t) => t.category === selectedCategory);
    }
    return sortTasks(list);
  }, [todayTasks, selectedCategory]);

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '높음';
      case 'medium': return '보통';
      case 'low': return '낮음';
      default: return '보통';
    }
  };

  const getKoreanDayOfWeek = () => {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return days[new Date().getDay()];
  };

  return (
    <div className="animate-fade-in">
      {/* 1. Stat Summary Banner */}
      <div className="stat-banner">
        <div className="stat-banner-header">
          <div>
            <div className="stat-banner-date">
              {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} · {getKoreanDayOfWeek()}
            </div>
            <h1 className="stat-banner-title">오늘 할 일</h1>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <div className="stat-counter-pill">
              남은 업무: {todayTasks.length}개
            </div>
            {rolloverCount > 0 && (
              <div className="rollover-badge" style={{ padding: '4px 10px', fontSize: '11px' }}>
                이월됨 {rolloverCount}
              </div>
            )}
          </div>
        </div>

        <div className="stat-progress-container">
          <div className="stat-progress-bar-bg">
            <div
              className="stat-progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="stat-progress-text">완료율 {progressPercent}%</span>
            <span className="stat-progress-text">{completedTodayCount} / {totalTodayCount} 완료</span>
          </div>
        </div>
      </div>

      {/* 2. Category horizontal scroll filter */}
      <div className="category-filter-scroll">
        <button
          className={`category-chip ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          전체
        </button>
        {categories.map((cat) => {
          const count = todayTasks.filter((t) => t.category === cat.id).length;
          return (
            <button
              key={cat.id}
              className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span
                className="category-color-dot"
                style={{ backgroundColor: cat.color, width: '8px', height: '8px' }}
              />
              {cat.name}
              {count > 0 && <span style={{ opacity: 0.7, fontSize: '11px',marginLeft: '2px' }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* 3. Task List Section */}
      <div className="todo-section-title">
        <span>실행 리스트</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>
          (이월 및 높은 우선순위가 상단에 배치됩니다)
        </span>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="empty-state">
          <Calendar size={48} className="empty-state-icon" />
          <h3 className="empty-state-title">오늘 예정된 업무가 없습니다</h3>
          <p className="empty-state-desc">아래의 [+] 버튼을 눌러 오늘 해야 할 일을 빠르게 등록해 보세요.</p>
        </div>
      ) : (
        <div className="todo-list">
          {filteredTasks.map((task, index) => {
            const cat = categoryMap.get(task.category);
            return (
              <div
                key={task.id}
                className={`todo-item ${task.status === 'rollover' ? 'rollover-border' : ''}`}
              >
                {/* Custom Checkbox */}
                <div className="todo-item-check">
                  <button
                    className="custom-checkbox"
                    onClick={() => onToggleTask(task.id)}
                    aria-label="Toggle completed"
                  >
                    ✓
                  </button>
                </div>

                {/* Card Body */}
                <div className="todo-item-body">
                  <div className="todo-item-title">{task.title}</div>
                  
                  {task.note && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '-2px' }}>
                      {task.note}
                    </div>
                  )}

                  <div className="todo-item-tags">
                    {task.status === 'rollover' && (
                      <span className="rollover-badge">
                        <AlertCircle size={10} />
                        어제 미완료 이월
                      </span>
                    )}
                    <span className="category-tag">{cat?.name || '기타'}</span>
                    <span className={`priority-tag ${task.priority}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons for Mobile Reordering / Delete */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    marginLeft: '8px',
                  }}
                >
                  <button
                    onClick={() => onMoveTask(task.id, 'up')}
                    disabled={index === 0}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: index === 0 ? 'var(--border-color)' : 'var(--text-muted)',
                      padding: '4px',
                      cursor: 'pointer',
                    }}
                    aria-label="Move Up"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    onClick={() => onMoveTask(task.id, 'down')}
                    disabled={index === filteredTasks.length - 1}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: index === filteredTasks.length - 1 ? 'var(--border-color)' : 'var(--text-muted)',
                      padding: '4px',
                      cursor: 'pointer',
                    }}
                    aria-label="Move Down"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('이 할 일을 삭제하시겠습니까?')) {
                        onDeleteTask(task.id);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      opacity: 0.7,
                      padding: '6px',
                      cursor: 'pointer',
                      marginTop: '4px',
                    }}
                    aria-label="Delete Task"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default TodayView;
