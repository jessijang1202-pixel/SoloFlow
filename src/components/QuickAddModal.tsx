import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar as CalIcon } from 'lucide-react';
import type { Category } from '../services/categoryService';
import { getTodayString } from '../services/todoService';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onAdd: (taskData: {
    title: string;
    category: string;
    dueDate: string;
    priority: 'high' | 'medium' | 'low';
    note: string;
    isWeeklyGoal: boolean;
    isMonthlyGoal: boolean;
  }) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAdd,
}) => {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dueDate, setDueDate] = useState(getTodayString());
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [note, setNote] = useState('');
  const [isWeeklyGoal, setIsWeeklyGoal] = useState(false);
  const [isMonthlyGoal, setIsMonthlyGoal] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Set default category on open
  useEffect(() => {
    if (isOpen) {
      // Reset inputs
      setTitle('');
      setDueDate(getTodayString());
      setPriority('medium');
      setNote('');
      setIsWeeklyGoal(false);
      setIsMonthlyGoal(false);
      
      // Auto focus
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, categories]);

  const todayDate = new Date();
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(todayDate.getDate() + 1);
  const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      title: title.trim(),
      category: categoryId,
      dueDate,
      priority,
      note: note.trim(),
      isWeeklyGoal,
      isMonthlyGoal,
    });
    
    onClose();
  };

  // Helper to set relative dates
  const setQuickDate = (type: 'today' | 'tomorrow' | 'weekly' | 'monthly') => {
    const today = new Date();
    if (type === 'today') {
      setDueDate(getTodayString());
      setIsWeeklyGoal(false);
      setIsMonthlyGoal(false);
    } else if (type === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const y = tomorrow.getFullYear();
      const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const d = String(tomorrow.getDate()).padStart(2, '0');
      setDueDate(`${y}-${m}-${d}`);
      setIsWeeklyGoal(false);
      setIsMonthlyGoal(false);
    } else if (type === 'weekly') {
      setIsWeeklyGoal(true);
      setIsMonthlyGoal(false);
      
      // Weekly goals expire at the end of the current week (Sunday)
      const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday
      const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay;
      const sunday = new Date(today);
      sunday.setDate(today.getDate() + daysUntilSunday);
      
      const y = sunday.getFullYear();
      const m = String(sunday.getMonth() + 1).padStart(2, '0');
      const d = String(sunday.getDate()).padStart(2, '0');
      setDueDate(`${y}-${m}-${d}`);
    } else if (type === 'monthly') {
      setIsWeeklyGoal(false);
      setIsMonthlyGoal(true);
      
      // Monthly goals expire at the last day of the current month
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const lastDayOfMonth = new Date(nextMonth.getTime() - 86400000);
      
      const y = lastDayOfMonth.getFullYear();
      const m = String(lastDayOfMonth.getMonth() + 1).padStart(2, '0');
      const d = String(lastDayOfMonth.getDate()).padStart(2, '0');
      setDueDate(`${y}-${m}-${d}`);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="bottom-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bottom-sheet-header">
          <h2 className="bottom-sheet-title">새로운 할 일 추가</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="task-title">할 일 제목</label>
            <input
              id="task-title"
              type="text"
              className="text-input"
              placeholder="예: 유튜브 대본 작성하기"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              ref={titleInputRef}
              required
              autoComplete="off"
            />
          </div>

          {/* Quick Date Selector */}
          <div className="form-group">
            <label className="form-label">일정 설정</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <button
                type="button"
                className={`btn ${dueDate === getTodayString() && !isWeeklyGoal && !isMonthlyGoal ? 'btn-primary' : 'btn-secondary'}`}
                style={{ minHeight: '40px', padding: '8px' }}
                onClick={() => setQuickDate('today')}
              >
                오늘
              </button>
              <button
                type="button"
                className={`btn ${dueDate === tomorrowStr && !isWeeklyGoal && !isMonthlyGoal ? 'btn-primary' : 'btn-secondary'}`}
                style={{ minHeight: '40px', padding: '8px' }}
                onClick={() => setQuickDate('tomorrow')}
              >
                내일
              </button>
              <button
                type="button"
                className={`btn ${isWeeklyGoal ? 'btn-primary' : 'btn-secondary'}`}
                style={{ minHeight: '40px', padding: '8px' }}
                onClick={() => setQuickDate('weekly')}
              >
                주간 목표
              </button>
              <button
                type="button"
                className={`btn ${isMonthlyGoal ? 'btn-primary' : 'btn-secondary'}`}
                style={{ minHeight: '40px', padding: '8px' }}
                onClick={() => setQuickDate('monthly')}
              >
                월간 목표
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalIcon size={18} style={{ color: 'var(--text-muted)' }} />
              <input
                type="date"
                className="date-input"
                style={{ flex: 1 }}
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  setIsWeeklyGoal(false); // Manually selecting date overrides weekly goal
                }}
              />
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="form-group">
            <label className="form-label" htmlFor="task-category">카테고리</label>
            <select
              id="task-category"
              className="select-input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Segmented Control */}
          <div className="form-group">
            <label className="form-label">우선순위</label>
            <div className="priority-selector">
              <button
                type="button"
                className={`priority-option ${priority === 'low' ? 'selected low' : ''}`}
                onClick={() => setPriority('low')}
              >
                낮음
              </button>
              <button
                type="button"
                className={`priority-option ${priority === 'medium' ? 'selected medium' : ''}`}
                onClick={() => setPriority('medium')}
              >
                보통
              </button>
              <button
                type="button"
                className={`priority-option ${priority === 'high' ? 'selected high' : ''}`}
                onClick={() => setPriority('high')}
              >
                높음
              </button>
            </div>
          </div>

          {/* Note (Optional) */}
          <div className="form-group">
            <label className="form-label" htmlFor="task-note">메모 (선택)</label>
            <input
              id="task-note"
              type="text"
              className="text-input"
              placeholder="추가 세부 사항 메모..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px', fontSize: '16px' }}
            disabled={!title.trim()}
          >
            일정 등록하기
          </button>
        </form>
      </div>
    </div>
  );
};
export default QuickAddModal;
