import React, { useMemo } from 'react';
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
  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // 1. Get dates of the current week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0: Sun, 1: Mon, ...
    
    // Calculate Monday date
    // If today is Sunday (0), Monday was 6 days ago. Otherwise, it is today - (dayOfWeek - 1).
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

  // 2. Filter Weekly Goals (tasks with isWeeklyGoal === true)
  const weeklyGoals = useMemo(() => {
    return tasks.filter(t => t.isWeeklyGoal);
  }, [tasks]);

  // 3. Group regular tasks by due date for this week
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    weekDays.forEach(d => map.set(d.dateString, []));

    tasks.forEach(task => {
      if (!task.isWeeklyGoal && map.has(task.dueDate)) {
        map.get(task.dueDate)!.push(task);
      }
    });
    return map;
  }, [tasks, weekDays]);

  return (
    <div className="weekly-container animate-fade-in">
      {/* View Header */}
      <div className="weekly-header">
        <h1 className="weekly-title">주간 일정표</h1>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
          {weekDays[0].label} ~ {weekDays[6].label}
        </div>
      </div>

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
    </div>
  );
};
export default WeeklyView;
