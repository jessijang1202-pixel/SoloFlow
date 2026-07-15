import { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import QuickAddModal from './components/QuickAddModal';
import TodayView from './views/TodayView';
import WeeklyView from './views/WeeklyView';
import CategoryView from './views/CategoryView';
import SettingsView from './views/SettingsView';
import AuthView from './views/AuthView';
import { X } from 'lucide-react';

import { todoService, getTodayString, sortTasks } from './services/todoService';
import type { Task } from './services/todoService';
import { categoryService } from './services/categoryService';
import type { Category } from './services/categoryService';
import { supabase } from './services/supabaseClient';
import type { User } from '@supabase/supabase-js';

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
  const [user, setUser] = useState<User | null>(null);

  // Edit task states
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Guest & Auth pending states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const pendingActionRef = useRef<((forceLocal?: boolean) => void) | null>(null);

  // PWA installation states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (navigator as any).standalone;
    
    if (isStandalone) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setIsInstallable(false);
    } else {
      // iOS/other browser fallback
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        alert("Safari 브라우저의 [공유] 버튼을 누른 후 [홈 화면에 추가]를 클릭하여 설치해 주세요!");
      } else {
        alert("이 브라우저에서는 자동 설치를 지원하지 않습니다. 브라우저 메뉴에서 '홈 화면에 추가' 또는 '앱 설치'를 클릭해 주세요.");
      }
    }
  };

  // 1. Sync Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('soloflow_theme', theme);
  }, [theme]);

  // 1.5. Auth Session Listener
  useEffect(() => {
    if (!supabase) return;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        // Clear all local states and storage on sign out
        localStorage.removeItem('soloflow_tasks');
        localStorage.removeItem('soloflow_categories');
        localStorage.removeItem('soloflow_last_opened_date');
        setTasks([]);
        setCategories([]);
        setActiveTab('today');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
        // Always verify and rollover synced past tasks to today
        const { tasks: rolledOverTasks } = todoService.checkAndRolloverTasks(syncedTasks);
        setTasks(rolledOverTasks);
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
  }, [user]);

  // --- Task Handlers ---

  const handleAddTask = (taskData: {
    title: string;
    category: string;
    dueDate: string;
    priority: 'high' | 'medium' | 'low';
    note: string;
    isWeeklyGoal: boolean;
    isMonthlyGoal: boolean;
  }) => {
    if (!user) {
      pendingActionRef.current = (forceLocal = false) => {
        const newTask = todoService.addTask(taskData);
        setTasks(prev => [...prev, newTask]);
        if (!forceLocal) {
          alert('회원가입이 완료되어 일정이 동기화되었습니다!');
        }
      };
      setIsAuthModalOpen(true);
      return;
    }

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

  const handleUpdateTask = (updatedTask: Task) => {
    if (!user) {
      pendingActionRef.current = (forceLocal = false) => {
        const updatedTasks = todoService.updateTask(updatedTask);
        setTasks(updatedTasks);
        if (!forceLocal) {
          alert('회원가입이 완료되어 수정 사항이 동기화되었습니다!');
        }
      };
      setIsAuthModalOpen(true);
      return;
    }

    const updatedTasks = todoService.updateTask(updatedTask);
    setTasks(updatedTasks);
  };

  const handleEditClick = (task: Task) => {
    setTaskToEdit(task);
    setIsQuickAddOpen(true);
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

  const handleUpdateCategories = (updatedCategories: Category[]) => {
    setCategories(updatedCategories);
  };

  // --- Category Handlers ---

  const handleAddCategory = (name: string, color: string, isProject = false, description = '') => {
    if (!user) {
      pendingActionRef.current = (forceLocal = false) => {
        categoryService.addCategory(name, color, isProject, description);
        setCategories(categoryService.getCategories());
        if (!forceLocal) {
          alert('회원가입이 완료되어 카테고리가 동기화되었습니다!');
        }
      };
      setIsAuthModalOpen(true);
      return;
    }

    categoryService.addCategory(name, color, isProject, description);
    setCategories(categoryService.getCategories());
  };

  const handleDeleteCategory = (id: string) => {
    categoryService.deleteCategory(id);
    setCategories(categoryService.getCategories());
  };

  // --- Data & Backup Actions ---

  const handleImportData = async (importedTasks: Task[]) => {
    const preparedTasks = importedTasks.map(t => ({ ...t, synced: false }));
    setTasks(preparedTasks);
    todoService.saveTasks(preparedTasks);
    
    // Upload each task sequentially
    for (const task of preparedTasks) {
      await todoService.saveTaskToSupabase(task);
    }
    // Deep sync to retrieve correct state
    const syncedTasks = await todoService.syncWithSupabase();
    setTasks(syncedTasks);
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

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
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
            onEditTask={handleEditClick}
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
            onUpdateCategories={handleUpdateCategories}
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
            onLogout={handleLogout}
            isInstallable={isInstallable}
            onInstallClick={handleInstallApp}
            onLoginClick={() => setIsAuthModalOpen(true)}
            onUpdateCategories={handleUpdateCategories}
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
            onEditTask={handleEditClick}
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

        <QuickAddModal
          isOpen={isQuickAddOpen}
          onClose={() => {
            setIsQuickAddOpen(false);
            setTaskToEdit(null);
          }}
          categories={categories}
          onAdd={handleAddTask}
          taskToEdit={taskToEdit}
          onEdit={handleUpdateTask}
        />
      </Layout>

      {/* Auth Modal Overlay */}
      {isAuthModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={() => setIsAuthModalOpen(false)}>
          <div 
            className="bottom-sheet animate-slide-up" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '440px', 
              margin: '0 auto',
              borderTopLeftRadius: 'var(--radius-lg)', 
              borderTopRightRadius: 'var(--radius-lg)',
              background: 'var(--bg-container)',
              border: '1px solid var(--border-color)',
              borderBottom: 'none',
              boxShadow: '0 -10px 25px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">계정 연동 및 저장</h2>
              <button className="close-btn" onClick={() => setIsAuthModalOpen(false)} aria-label="Close modal">
                <X size={24} />
              </button>
            </div>
            
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '0 24px', margin: '0 0 16px 0', lineHeight: '1.5', textAlign: 'center' }}>
              회원가입 또는 로그인 시 작성하신 일정이 클라우드에 안전하게 연동 및 백업되어 다른 기기에서도 확인하실 수 있습니다.
            </p>

            <div style={{ padding: '0 24px 24px 24px', overflowY: 'auto', maxHeight: '70vh' }}>
              <AuthView 
                onAuthSuccess={() => {
                  setIsAuthModalOpen(false);
                  if (pendingActionRef.current) {
                    pendingActionRef.current(false);
                    pendingActionRef.current = null;
                  }
                }} 
              />
              
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', minHeight: '44px', marginTop: '12px', fontSize: '14px' }}
                onClick={() => {
                  setIsAuthModalOpen(false);
                  if (pendingActionRef.current) {
                    pendingActionRef.current(true);
                    pendingActionRef.current = null;
                  }
                }}
              >
                로그인 없이 그냥 저장하기 (기기 로컬에 저장)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
