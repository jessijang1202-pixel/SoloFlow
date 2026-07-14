import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Trophy, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight
} from 'lucide-react';
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
  const [selectedProjId, setSelectedProjId] = useState<string>('all');
  
  // Monthly Calendar States
  const [activeCalDate, setActiveCalDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getTodayString());

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Projects list for dropdown selector
  const projectsList = useMemo(() => {
    return categories.filter(c => c.isProject);
  }, [categories]);

  // Current year/month string (YYYY-MM) for active calendar date
  const activeMonthStr = useMemo(() => {
    const y = activeCalDate.getFullYear();
    const m = String(activeCalDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [activeCalDate]);

  // 1. WEEKLY VIEW LOGIC: Get dates of the current week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
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

  // Filter Weekly Goals (week view)
  const weeklyGoals = useMemo(() => {
    return tasks.filter(t => t.isWeeklyGoal);
  }, [tasks]);

  // Group regular tasks by due date for this week
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


  // 2. MONTHLY VIEW LOGIC:
  // Filter core goals: "이번달 핵심 목표는 카테고리별로 주간 목표를 열거해주고"
  // Filtered by selected project and current calendar month
  const filteredWeeklyGoals = useMemo(() => {
    let list = tasks.filter(t => t.isWeeklyGoal && t.dueDate.startsWith(activeMonthStr));
    if (selectedProjId !== 'all') {
      list = list.filter(t => t.category === selectedProjId);
    }
    return list;
  }, [tasks, activeMonthStr, selectedProjId]);

  // Group goals by category
  const goalsByCategory = useMemo(() => {
    const groups = new Map<string, Task[]>();
    filteredWeeklyGoals.forEach(goal => {
      const catId = goal.category || 'other';
      if (!groups.has(catId)) {
        groups.set(catId, []);
      }
      groups.get(catId)!.push(goal);
    });
    return groups;
  }, [filteredWeeklyGoals]);

  // Group regular monthly tasks by day (for dots rendering)
  const regularTasksByDayOfMonth = useMemo(() => {
    const map = new Map<string, Task[]>();
    
    // Regular plans (exclude goals) in active month
    let list = tasks.filter(
      t => !t.isWeeklyGoal && !t.isMonthlyGoal && t.dueDate.startsWith(activeMonthStr)
    );

    if (selectedProjId !== 'all') {
      list = list.filter(t => t.category === selectedProjId);
    }

    list.forEach(task => {
      if (!map.has(task.dueDate)) {
        map.set(task.dueDate, []);
      }
      map.get(task.dueDate)!.push(task);
    });
    return map;
  }, [tasks, activeMonthStr, selectedProjId]);

  // Detailed list of tasks for the selected day in calendar
  const selectedDayTasks = useMemo(() => {
    let list = tasks.filter(t => t.dueDate === selectedDateStr && !t.isWeeklyGoal && !t.isMonthlyGoal);
    if (selectedProjId !== 'all') {
      list = list.filter(t => t.category === selectedProjId);
    }
    return list;
  }, [tasks, selectedDateStr, selectedProjId]);

  // Calendar cells mapping
  const calendarCells = useMemo(() => {
    const year = activeCalDate.getFullYear();
    const month = activeCalDate.getMonth(); // 0-indexed

    // First day of active month
    const firstDay = new Date(year, month, 1);
    // Day of the week of the first day (0: Sun, 1: Mon, ..., 6: Sat)
    const startDayOfWeek = firstDay.getDay();

    // Total days in the active month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Total days in the previous month
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const cells = [];

    // Prefix days (from previous month)
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cells.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: true,
      });
    }

    // Suffix days (from next month) to complete the grid row
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        cells.push({
          dayNum: i,
          dateStr,
          isCurrentMonth: false,
        });
      }
    }

    return cells;
  }, [activeCalDate]);

  // Calendar navigation callbacks
  const changeMonth = (offset: number) => {
    const copy = new Date(activeCalDate);
    copy.setMonth(activeCalDate.getMonth() + offset);
    setActiveCalDate(copy);
  };

  const changeYear = (offset: number) => {
    const copy = new Date(activeCalDate);
    copy.setFullYear(activeCalDate.getFullYear() + offset);
    setActiveCalDate(copy);
  };

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="weekly-title" style={{ margin: 0 }}>
            {viewMode === 'week' ? '주간 일정표' : '월간 일정표'}
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
            {viewMode === 'week' ? (
              `${weekDays[0].label} ~ ${weekDays[6].label}`
            ) : (
              `${activeCalDate.getFullYear()}년 ${activeCalDate.getMonth() + 1}월`
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
          {/* Project Selector - "캘린더위에 프로젝트를 선택하게 해주고" */}
          <div className="form-group" style={{ marginBottom: '8px' }}>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              프로젝트 필터
            </label>
            <select
              className="select-input"
              value={selectedProjId}
              onChange={(e) => setSelectedProjId(e.target.value)}
              style={{ width: '100%', minHeight: '40px', padding: '8px', fontSize: '14px', borderRadius: 'var(--radius-md)' }}
            >
              <option value="all">전체 프로젝트 보기</option>
              {projectsList.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* A. Monthly Goals Section - "이번달 핵심 목표는 카테고리별로 주간 목표를 열거해주고" */}
          <div className="weekly-goals-card" style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Trophy size={18} style={{ color: 'var(--accent-color)' }} />
              <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>이번 달 핵심 목표</h2>
            </div>
            
            {goalsByCategory.size === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                이번 달 등록된 핵심 주간 목표가 없습니다.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Array.from(goalsByCategory.entries()).map(([catId, goals]) => {
                  const cat = categoryMap.get(catId);
                  return (
                    <div key={catId} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cat?.color || 'var(--text-muted)' }} />
                        {cat?.name || '기타'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '14px' }}>
                        {goals.map(goal => (
                          <div 
                            key={goal.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              fontSize: '13px',
                              color: goal.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)',
                              textDecoration: goal.status === 'done' ? 'line-through' : 'none'
                            }}
                          >
                            <button
                              className="custom-checkbox"
                              style={{
                                width: '15px',
                                height: '15px',
                                borderColor: goal.status === 'done' ? 'var(--accent-color)' : 'var(--text-muted)',
                                backgroundColor: goal.status === 'done' ? 'var(--accent-color)' : 'transparent',
                                color: goal.status === 'done' ? 'white' : 'transparent',
                                fontSize: '8px',
                                padding: 0
                              }}
                              onClick={() => onToggleTask(goal.id)}
                            >
                              ✓
                            </button>
                            {goal.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* B. Monthly Calendar - "그 아래에 캘린더가 위치하게 해줘. 캘린더는 1개만 화면에 보여지게 하고 다음달 다음해까지 넘겨 볼수 있게 해줘" */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Calendar Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="btn btn-secondary" style={{ padding: '6px 10px', minHeight: 'auto' }} onClick={() => changeYear(-1)} aria-label="Prev year">
                  <ChevronsLeft size={16} />
                </button>
                <button className="btn btn-secondary" style={{ padding: '6px 10px', minHeight: 'auto' }} onClick={() => changeMonth(-1)} aria-label="Prev month">
                  <ChevronLeft size={16} />
                </button>
              </div>

              <span style={{ fontSize: '14px', fontWeight: 800 }}>
                {activeCalDate.getFullYear()}년 {activeCalDate.getMonth() + 1}월
              </span>

              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="btn btn-secondary" style={{ padding: '6px 10px', minHeight: 'auto' }} onClick={() => changeMonth(1)} aria-label="Next month">
                  <ChevronRight size={16} />
                </button>
                <button className="btn btn-secondary" style={{ padding: '6px 10px', minHeight: 'auto' }} onClick={() => changeYear(1)} aria-label="Next year">
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>

            {/* Calendar Grid container */}
            <div className="calendar-grid">
              {/* Day headers */}
              {['일', '월', '화', '수', '목', '금', '토'].map((h, idx) => (
                <div key={idx} className="calendar-cell-header" style={{ color: idx === 0 ? '#ef4444' : (idx === 6 ? '#3b82f6' : 'var(--text-muted)') }}>
                  {h}
                </div>
              ))}

              {/* Day cells */}
              {calendarCells.map((cell, idx) => {
                const isToday = cell.dateStr === getTodayString();
                const isActive = cell.dateStr === selectedDateStr;
                const cellTasks = regularTasksByDayOfMonth.get(cell.dateStr) || [];
                const dayIndex = idx % 7; // Sunday is 0, Saturday is 6

                return (
                  <div
                    key={idx}
                    className={`calendar-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${isActive ? 'active-day' : ''}`}
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                  >
                    <span 
                      className={`calendar-cell-num ${isToday ? 'today-num' : ''}`}
                      style={{ color: dayIndex === 0 ? '#ef4444' : (dayIndex === 6 ? '#3b82f6' : undefined) }}
                    >
                      {cell.dayNum}
                    </span>

                    {/* Task Indicators */}
                    {cellTasks.length > 0 && (
                      <div className="calendar-dots-container">
                        {cellTasks.slice(0, 3).map(t => {
                          const color = categoryMap.get(t.category)?.color || 'var(--accent-color)';
                          return (
                            <span key={t.id} className="calendar-dot" style={{ backgroundColor: color }} />
                          );
                        })}
                        {cellTasks.length > 3 && (
                          <span className="calendar-dot-plus">+</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* C. Selected Date Details List */}
          <div className="weekly-goals-card" style={{ marginTop: '4px', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                📅 {getMonthLabel(selectedDateStr)} ({getDayName(selectedDateStr)}) 일정 ({selectedDayTasks.length})
              </h3>
            </div>

            {selectedDayTasks.length === 0 ? (
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                이 날짜에 계획된 마감 업무가 없습니다.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedDayTasks.map(task => {
                  const cat = categoryMap.get(task.category);
                  return (
                    <div 
                      key={task.id} 
                      className={`weekly-mini-task ${task.status === 'done' ? 'done' : ''}`}
                      style={{ padding: '8px 10px', background: 'var(--bg-surface)' }}
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
                        <span style={{ color: 'var(--priority-high-text)', fontWeight: 'bold', fontSize: '10px', marginRight: '6px' }}>!!!</span>
                      )}
                      <span style={{ fontSize: '9px', opacity: 0.8, backgroundColor: 'var(--bg-active)', padding: '1px 5px', borderRadius: '4px' }}>
                        {cat?.name || '기타'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
export default WeeklyView;
