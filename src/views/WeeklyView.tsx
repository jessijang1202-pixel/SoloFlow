import React, { useState, useMemo } from 'react';
import { Calendar, Trophy } from 'lucide-react';
import { getTodayString } from '../services/todoService';
import type { Task } from '../services/todoService';
import type { Category } from '../services/categoryService';

interface WeeklyViewProps {
  tasks: Task[];
  categories: Category[];
  onToggleTask: (id: string) => void;
}

export const WeeklyView: React.FC<WeeklyViewProps> = ({ tasks, categories, onToggleTask }) => {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Current year/month string (YYYY-MM)
  const currentMonthStr = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  // 1. Get dates of the current week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0: Sun, 1: Mon, ...
    
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    const days = [];
    const dayNames = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      days.push({
        name: dayNames[i],
        dateString,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        isToday: dateString === getTodayString(),
      });
    }
    return days;
  }, []);

  // 2. Filter Weekly Goals
  const weeklyGoals = useMemo(() => {
    return tasks.filter(t => t.isWeeklyGoal);
  }, [tasks]);

  // 3. Group regular tasks by due date for this week
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    weekDays.forEach(d => map.set(d.dateString, []));

    tasks.forEach(task => {
      if (!task.isWeeklyGoal && !task.isMonthlyGoal && map.has(task.dueDate)) {
        map.get(task.dueDate)!.push(task);
      }
    });
    return map;
  }, [tasks, weekDays]);

  // 4. Monthly Goals
  const monthlyGoals = useMemo(() => {
    return tasks.filter(t => t.isMonthlyGoal && t.dueDate.startsWith(currentMonthStr));
  }, [tasks, currentMonthStr]);

  // 5. Group monthly tasks by day
  const tasksByDayOfMonth = useMemo(() => {
    const map = new Map<string, Task[]>();
    const monthlyTasks = tasks.filter(
      t => !t.isWeeklyGoal && !t.isMonthlyGoal && t.dueDate.startsWith(currentMonthStr)
    );

    monthlyTasks.forEach(task => {
      if (!map.has(task.dueDate)) {
        map.set(task.dueDate, []);
      }
      map.get(task.dueDate)!.push(task);
    });
    return map;
  }, [tasks, currentMonthStr]);

  // Unique sorted dates of the month that have tasks
  const monthDaysWithTasks = useMemo(() => {
    const dates = Array.from(tasksByDayOfMonth.keys());
    return dates.sort();
  }, [tasksByDayOfMonth]);

  const getDayName = (dateString: string) => {
    const date = new Date(dateString);
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return dayNames[date.getDay()];
  };

  const getMonthLabel = (dateString: string) => {
    const parts = dateString.split('-');
    if (parts.length < 3) return dateString;
    return `${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일`;
  };

  return (
    <div className="weekly-container animate-fade-in">
      {/* View Switcher Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="weekly-title" style={{ margin: 0 }}>
            {viewMode === 'week' ? '주간 일정표' : '월간 일정표'}
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
            {viewMode === 'week' ? (
              `${weekDays[0].label} ~ ${weekDays[6].label}`
            ) : (
              `${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월`
            )}
          </div>
        </div>

        {/* Segmented Tab Swapper */}
        <div className="project-tabs-container" style={{ margin: 0, padding: '2px' }}>
          <button
            className={`project-tab-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
            style={{ fontSize: '13px', padding: '8px 12px' }}
          >
            🗓️ 주간 계획
          </button>
          <button
            className={`project-tab-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
            style={{ fontSize: '13px', padding: '8px 12px' }}
          >
            📅 월간 계획
          </button>
        </div>
      </div>

      {viewMode === 'week' ? (
        <>
          {/* A. Weekly Goals Section */}
          <div className="weekly-goals-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Trophy size={20} style={{ color: 'var(--accent-color)' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700 }}>이번 주 핵심 목표</h2>
            </div>
            
            {weeklyGoals.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                등록된 주간 핵심 목표가 없습니다. 하단의 [+] 버튼을 누르고 '주간 목표'를 지정해 보세요.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {weeklyGoals.map(goal => {
                  const cat = categoryMap.get(goal.category);
                  return (
                    <div 
                      key={goal.id} 
                      className={`weekly-mini-task ${goal.status === 'done' ? 'done' : ''}`}
                      style={{ padding: '10px 12px' }}
                    >
                      <button 
                        className="custom-checkbox" 
                        style={{ 
                          width: '18px', 
                          height: '18px', 
                          borderColor: goal.status === 'done' ? 'var(--accent-color)' : 'var(--text-muted)',
                          backgroundColor: goal.status === 'done' ? 'var(--accent-color)' : 'transparent',
                          color: goal.status === 'done' ? 'white' : 'transparent',
                          marginRight: '8px',
                          fontSize: '10px'
                        }}
                        onClick={() => onToggleTask(goal.id)}
                      >
                        ✓
                      </button>
                      <span style={{ flex: 1, fontWeight: goal.status === 'done' ? 'normal' : '600' }}>
                        {goal.title}
                      </span>
                      <span style={{ fontSize: '10px', opacity: 0.8, backgroundColor: 'var(--bg-active)', padding: '2px 6px', borderRadius: '4px' }}>
                        {cat?.name || '기타'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* B. Daily Schedule Calendar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
            <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-secondary)' }}>요일별 마감 업무</h2>
          </div>

          <div className="weekly-days-list">
            {weekDays.map(day => {
              const dayTasks = tasksByDay.get(day.dateString) || [];
              const doneTasksCount = dayTasks.filter(t => t.status === 'done').length;
              
              return (
                <div 
                  key={day.dateString} 
                  className="weekly-day-card"
                  style={day.isToday ? { borderColor: 'var(--accent-color)', borderWidth: '1.5px', background: 'linear-gradient(180deg, var(--card-bg) 0%, rgba(167, 139, 250, 0.03) 100%)' } : {}}
                >
                  <div className="weekly-day-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="weekly-day-name">{day.name}</span>
                      <span className="weekly-day-date">{day.label}</span>
                      {day.isToday && (
                        <span 
                          style={{ 
                            fontSize: '9px', 
                            backgroundColor: 'var(--accent-color)', 
                            color: 'white', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            fontWeight: 'bold' 
                          }}
                        >
                          TODAY
                        </span>
                      )}
                    </div>
                    {dayTasks.length > 0 && (
                      <span className="weekly-day-count">
                        {doneTasksCount}/{dayTasks.length} 완료
                      </span>
                    )}
                  </div>

                  {dayTasks.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '4px' }}>
                      등록된 업무가 없습니다.
                    </p>
                  ) : (
                    <div className="weekly-day-tasks">
                      {dayTasks.map(task => {
                        return (
                          <div 
                            key={task.id} 
                            className={`weekly-mini-task ${task.status === 'done' ? 'done' : ''}`}
                          >
                            <button 
                              className="custom-checkbox" 
                              style={{ 
                                width: '16px', 
                                height: '16px', 
                                borderColor: task.status === 'done' ? 'var(--accent-color)' : 'var(--text-muted)',
                                backgroundColor: task.status === 'done' ? 'var(--accent-color)' : 'transparent',
                                color: task.status === 'done' ? 'white' : 'transparent',
                                fontSize: '9px'
                              }}
                              onClick={() => onToggleTask(task.id)}
                            >
                              ✓
                            </button>
                            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {task.title}
                            </div>
                            {task.priority === 'high' && (
                              <span style={{ color: 'var(--priority-high-text)', fontWeight: 'bold', fontSize: '9px' }}>!!!</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* A. Monthly Goals Section */}
          <div className="weekly-goals-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Trophy size={20} style={{ color: 'var(--accent-color)' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700 }}>이번 달 핵심 목표</h2>
            </div>
            
            {monthlyGoals.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                등록된 월간 핵심 목표가 없습니다. 하단의 [+] 버튼을 누르고 '월간 목표'를 지정해 보세요.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {monthlyGoals.map(goal => {
                  const cat = categoryMap.get(goal.category);
                  return (
                    <div 
                      key={goal.id} 
                      className={`weekly-mini-task ${goal.status === 'done' ? 'done' : ''}`}
                      style={{ padding: '10px 12px' }}
                    >
                      <button 
                        className="custom-checkbox" 
                        style={{ 
                          width: '18px', 
                          height: '18px', 
                          borderColor: goal.status === 'done' ? 'var(--accent-color)' : 'var(--text-muted)',
                          backgroundColor: goal.status === 'done' ? 'var(--accent-color)' : 'transparent',
                          color: goal.status === 'done' ? 'white' : 'transparent',
                          marginRight: '8px',
                          fontSize: '10px'
                        }}
                        onClick={() => onToggleTask(goal.id)}
                      >
                        ✓
                      </button>
                      <span style={{ flex: 1, fontWeight: goal.status === 'done' ? 'normal' : '600' }}>
                        {goal.title}
                      </span>
                      <span style={{ fontSize: '10px', opacity: 0.8, backgroundColor: 'var(--bg-active)', padding: '2px 6px', borderRadius: '4px' }}>
                        {cat?.name || '기타'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* B. Monthly Daily List */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
            <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-secondary)' }}>일자별 계획된 업무</h2>
          </div>

          {monthDaysWithTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 20px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>이번 달 등록된 실행 일정이 없습니다.</p>
            </div>
          ) : (
            <div className="weekly-days-list">
              {monthDaysWithTasks.map(dateStr => {
                const dayTasks = tasksByDayOfMonth.get(dateStr) || [];
                const doneTasksCount = dayTasks.filter(t => t.status === 'done').length;
                const isToday = dateStr === getTodayString();

                return (
                  <div 
                    key={dateStr} 
                    className="weekly-day-card"
                    style={isToday ? { borderColor: 'var(--accent-color)', borderWidth: '1.5px', background: 'linear-gradient(180deg, var(--card-bg) 0%, rgba(167, 139, 250, 0.03) 100%)' } : {}}
                  >
                    <div className="weekly-day-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="weekly-day-name">{getMonthLabel(dateStr)}</span>
                        <span className="weekly-day-date">({getDayName(dateStr).substring(0, 1)})</span>
                        {isToday && (
                          <span 
                            style={{ 
                              fontSize: '9px', 
                              backgroundColor: 'var(--accent-color)', 
                              color: 'white', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              fontWeight: 'bold' 
                            }}
                          >
                            TODAY
                          </span>
                        )}
                      </div>
                      <span className="weekly-day-count">
                        {doneTasksCount}/{dayTasks.length} 완료
                      </span>
                    </div>

                    <div className="weekly-day-tasks">
                      {dayTasks.map(task => {
                        return (
                          <div 
                            key={task.id} 
                            className={`weekly-mini-task ${task.status === 'done' ? 'done' : ''}`}
                          >
                            <button 
                              className="custom-checkbox" 
                              style={{ 
                                width: '16px', 
                                height: '16px', 
                                borderColor: task.status === 'done' ? 'var(--accent-color)' : 'var(--text-muted)',
                                backgroundColor: task.status === 'done' ? 'var(--accent-color)' : 'transparent',
                                color: task.status === 'done' ? 'white' : 'transparent',
                                fontSize: '9px'
                              }}
                              onClick={() => onToggleTask(task.id)}
                            >
                              ✓
                            </button>
                            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {task.title}
                            </div>
                            {task.priority === 'high' && (
                              <span style={{ color: 'var(--priority-high-text)', fontWeight: 'bold', fontSize: '9px' }}>!!!</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default WeeklyView;
