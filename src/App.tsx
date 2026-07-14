import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import QuickAddModal from './components/QuickAddModal';
import TodayView from './views/TodayView';
import WeeklyView from './views/WeeklyView';
import CategoryView from './views/CategoryView';
import SettingsView from './views/SettingsView';

import { todoService, getTodayString, sortTasks } from './services/todoService';
import type { Task } from './services/todoService';
import { categoryService } from './services/categoryService';
import type { Category } from './services/categoryService';
import { supabase } from './services/supabaseClient';

import './App.css';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('soloflow_theme');
    return (saved as 'light' | 'dark') || 'dark';
  });

  const [activeTab, setActiveTab] = useState<string>('today');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // 1. Sync Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('soloflow_theme', theme);
  }, [theme]);

  // 2. Initial Setup: Load categories, tasks and check for Auto-Rollover
  useEffect(() => {
    // A. Load Categories (Local First)
    const loadedCategories = categoryService.getCategories();
    setCategories(loadedCategories);

    // B. Check for Auto-Rollover and load tasks (Local First)
    const { tasks: rolledOverTasks, rolloverCount } = todoService.checkAndRolloverTasks();
    setTasks(rolledOverTasks);

    // C. Trigger a cute alert if tasks were rolled over
    if (rolloverCount > 0) {
      setTimeout(() => {
        alert(
          `📅 날짜 변경 감지!\n어제 미처 완료하지 못한 업무 ${rolloverCount}개가 오늘 할 일로 자동 이월되었습니다.`
        );
      }, 600);
    }

    // D. Sync with remote Supabase database in background
    const syncDatabase = async () => {
      try {
        const syncedCats = await categoryService.syncWithSupabase();
        setCategories(syncedCats);

        const syncedTasks = await todoService.syncWithSupabase();
        setTasks(syncedTasks);
      } catch (err) {
        console.error('Database sync failed:', err);
      }
    };

    syncDatabase();

    // 10 seconds polling fallback
    const intervalId = setInterval(() => {
      syncDatabase();
    }, 10000);

    // Realtime listener
    let subscription: any = null;
    if (supabase) {
      subscription = supabase
        .channel('db-sync-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'todos' },
          () => {
            syncDatabase();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'categories' },
          () => {
            syncDatabase();
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(intervalId);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // --- Task Handlers ---

  const handleAddTask = (taskData: {
    title: string;
    category: string;
    dueDate: string;
    priority: 'high' | 'medium' | 'low';
    note: string;
    isWeeklyGoal: boolean;
  }) => {
    const newTask = todoService.addTask(taskData);
    setTasks(prev => [...prev, newTask]);
  };

  const handleToggleTask = (id: string) => {
    const { tasks: updatedTasks } = todoService.toggleTaskStatus(id);
    setTasks(updatedTasks);
  };

  const handleDeleteTask = (id: string) => {
    const updatedTasks = todoService.deleteTask(id);
    setTasks(updatedTasks);
  };

  // Persists re-ordered items by swiping order values in the array
  const handleMoveTask = (id: string, direction: 'up' | 'down') => {
    const todayStr = getTodayString();
    
    // 1. Get current visible list sorted correctly
    const todayList = tasks.filter(t => t.dueDate === todayStr && !t.isWeeklyGoal && t.status !== 'done');
    const sorted = sortTasks(todayList);
    
    // 2. Find target positions
    const index = sorted.findIndex(t => t.id === id);
    if (index === -1) return;

    const swapTargetIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapTargetIndex < 0 || swapTargetIndex >= sorted.length) return;

    // 3. Swap targets in array
    const reorderedList = [...sorted];
    const temp = reorderedList[index];
    reorderedList[index] = reorderedList[swapTargetIndex];
    reorderedList[swapTargetIndex] = temp;

    // 4. Map IDs to new orders
    const orderMap = new Map(reorderedList.map((t, idx) => [t.id, idx]));

    // 5. Update global state tasks
    const updatedTasks = tasks.map(task => {
      if (orderMap.has(task.id)) {
        return {
          ...task,
          order: orderMap.get(task.id)!,
        };
      }
      return task;
    });

    setTasks(updatedTasks);
    todoService.saveTasks(updatedTasks);
  };

  // --- Category Handlers ---

  const handleAddCategory = (name: string, color: string, isProject = false, description = '') => {
    categoryService.addCategory(name, color, isProject, description);
    setCategories(categoryService.getCategories());
  };

  const handleDeleteCategory = (id: string) => {
    categoryService.deleteCategory(id);
    setCategories(categoryService.getCategories());
  };

  // --- Data & Backup Actions ---

  const handleImportData = (importedTasks: Task[]) => {
    setTasks(importedTasks);
    todoService.saveTasks(importedTasks);
  };

  const handleClearAllData = () => {
    // Clear Local Storage
    localStorage.removeItem('soloflow_tasks');
    localStorage.removeItem('soloflow_categories');
    localStorage.removeItem('soloflow_last_opened_date');
    
    // Reload States
    setTasks([]);
    setCategories(categoryService.getCategories()); // reload system categories
    setActiveTab('today');
  };

  // Render view depending on activeTab state
  const renderActiveView = () => {
    switch (activeTab) {
      case 'today':
        return (
          <TodayView
            tasks={tasks}
            categories={categories}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onMoveTask={handleMoveTask}
          />
        );
      case 'weekly':
        return (
          <WeeklyView
            tasks={tasks}
            categories={categories}
            onToggleTask={handleToggleTask}
          />
        );
      case 'category':
        return (
          <CategoryView
            categories={categories}
            tasks={tasks}
          />
        );
      case 'settings':
        return (
          <SettingsView
            tasks={tasks}
            onImportData={handleImportData}
            onClearAllData={handleClearAllData}
            categories={categories}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        );
      default:
        return (
          <TodayView
            tasks={tasks}
            categories={categories}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onMoveTask={handleMoveTask}
          />
        );
    }
  };

  return (
    <>
      <Layout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onQuickAddClick={() => setIsQuickAddOpen(true)}
        theme={theme}
        toggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
      >
        {renderActiveView()}
      </Layout>

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        categories={categories}
        onAdd={handleAddTask}
      />
    </>
  );
}

export default App;
