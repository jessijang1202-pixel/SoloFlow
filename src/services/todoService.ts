import { supabase } from './supabaseClient';

export interface Task {
  id: string;
  title: string;
  category: string; // Category ID
  dueDate: string; // YYYY-MM-DD
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'done' | 'rollover';
  createdAt: string; // ISO string
  completedAt: string | null;
  rolledOverFrom: string | null; // Original due date
  note: string;
  isWeeklyGoal: boolean;
  isMonthlyGoal?: boolean;
  order: number;
}

const LOCAL_STORAGE_KEY = 'soloflow_tasks';

export const getTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const todoService = {
  getTasks(): Task[] {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  },

  saveTasks(tasks: Task[]): void {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
  },

  addTask(taskData: Omit<Task, 'id' | 'status' | 'createdAt' | 'completedAt' | 'rolledOverFrom' | 'order'>): Task {
    const tasks = this.getTasks();
    const newOrder = tasks.filter(t => t.dueDate === taskData.dueDate).length;
    
    const newTask: Task = {
      ...taskData,
      status: 'todo',
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      completedAt: null,
      rolledOverFrom: null,
      order: newOrder,
    };

    tasks.push(newTask);
    this.saveTasks(tasks);
    this.saveTaskToSupabase(newTask);
    return newTask;
  },

  updateTask(updatedTask: Task): Task[] {
    const tasks = this.getTasks();
    const newTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    this.saveTasks(newTasks);
    this.saveTaskToSupabase(updatedTask);
    return newTasks;
  },

  deleteTask(id: string): Task[] {
    const tasks = this.getTasks();
    const newTasks = tasks.filter(t => t.id !== id);
    this.saveTasks(newTasks);
    this.deleteTaskFromSupabase(id);
    return newTasks;
  },

  toggleTaskStatus(id: string): { tasks: Task[]; completedCount: number } {
    const tasks = this.getTasks();
    let completedCount = 0;
    
    const newTasks = tasks.map(t => {
      if (t.id === id) {
        const isDone = t.status === 'done';
        const nextStatus = isDone 
          ? (t.rolledOverFrom ? 'rollover' as const : 'todo' as const) 
          : 'done' as const;
          
        if (nextStatus === 'done') completedCount++;
        
        return {
          ...t,
          status: nextStatus,
          completedAt: nextStatus === 'done' ? new Date().toISOString() : null,
        };
      }
      return t;
    });

    this.saveTasks(newTasks);
    const updated = newTasks.find(t => t.id === id);
    if (updated) this.saveTaskToSupabase(updated);
    return { tasks: newTasks, completedCount };
  },

  // Auto-Rollover Logic: Find incomplete past tasks and move them to Today
  checkAndRolloverTasks(): { tasks: Task[]; rolloverCount: number } {
    const todayStr = getTodayString();
    const lastOpened = localStorage.getItem('soloflow_last_opened_date');
    const tasks = this.getTasks();
    let rolloverCount = 0;

    // Check if the day has changed or it's first run
    if (!lastOpened || lastOpened < todayStr) {
      const updatedTasks = tasks.map(task => {
        // If task is incomplete and dueDate is in the past (before today)
        if ((task.status === 'todo' || task.status === 'rollover') && task.dueDate < todayStr && !task.isWeeklyGoal) {
          rolloverCount++;
          return {
            ...task,
            status: 'rollover' as const,
            rolledOverFrom: task.rolledOverFrom || task.dueDate, // Keep track of the original due date
            dueDate: todayStr, // Update due date to today
          };
        }
        return task;
      });

      if (rolloverCount > 0) {
        this.saveTasks(updatedTasks);
        updatedTasks.forEach((task, idx) => {
          if (task !== tasks[idx]) {
            this.saveTaskToSupabase(task);
          }
        });
      }
      localStorage.setItem('soloflow_last_opened_date', todayStr);
      return { tasks: rolloverCount > 0 ? updatedTasks : tasks, rolloverCount };
    }

    return { tasks, rolloverCount: 0 };
  },

  // Update reorder inside a specific due date group
  updateTasksOrder(dueDate: string, orderedTaskIds: string[]): Task[] {
    const tasks = this.getTasks();
    
    const idToOrderMap = new Map<string, number>();
    orderedTaskIds.forEach((id, index) => {
      idToOrderMap.set(id, index);
    });

    const newTasks = tasks.map(t => {
      if (t.dueDate === dueDate && idToOrderMap.has(t.id)) {
        return {
          ...t,
          order: idToOrderMap.get(t.id)!,
        };
      }
      return t;
    });

    this.saveTasks(newTasks);
    newTasks.forEach((t, idx) => {
      if (t.order !== tasks[idx].order) {
        this.saveTaskToSupabase(t);
      }
    });
    return newTasks;
  },

  async syncWithSupabase(): Promise<Task[]> {
    if (!supabase) {
      return this.getTasks();
    }
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*');
      if (error) throw error;
      
      const localTasks = this.getTasks();
      const remoteTasks: Task[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        category: item.category_id || '',
        dueDate: item.due_date,
        priority: item.priority as 'high' | 'medium' | 'low',
        status: item.status as 'todo' | 'done' | 'rollover',
        createdAt: item.created_at,
        completedAt: item.completed_at,
        rolledOverFrom: item.rolled_over_from,
        note: item.note || '',
        isWeeklyGoal: item.is_weekly_goal,
        isMonthlyGoal: item.is_monthly_goal || false,
        order: item.order || 0,
      }));

      // Merging: combine local and remote using task ID as key
      const mergedMap = new Map<string, Task>();
      localTasks.forEach(t => mergedMap.set(t.id, t));
      
      let remoteHasNew = false;
      let localHasNew = false;

      remoteTasks.forEach(t => {
        if (!mergedMap.has(t.id)) {
          remoteHasNew = true;
          mergedMap.set(t.id, t);
        } else {
          // If remote is different, overwrite local
          const local = mergedMap.get(t.id)!;
          if (JSON.stringify(local) !== JSON.stringify(t)) {
            mergedMap.set(t.id, t);
          }
        }
      });

      // Upload local tasks that remote doesn't have yet
      for (const t of localTasks) {
        if (!remoteTasks.some(rt => rt.id === t.id)) {
          localHasNew = true;
          await this.saveTaskToSupabase(t);
        }
      }

      const mergedList = Array.from(mergedMap.values());
      if (remoteHasNew || localHasNew) {
        this.saveTasks(mergedList);
      }
      
      return mergedList;
    } catch (err) {
      console.error('Failed to sync tasks with Supabase:', err);
    }
    return this.getTasks();
  },

  async saveTaskToSupabase(task: Task) {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('todos')
        .upsert({
          id: task.id,
          title: task.title,
          category_id: task.category || null,
          due_date: task.dueDate,
          priority: task.priority,
          status: task.status,
          created_at: task.createdAt,
          completed_at: task.completedAt,
          rolled_over_from: task.rolledOverFrom,
          note: task.note || '',
          is_weekly_goal: task.isWeeklyGoal,
          is_monthly_goal: task.isMonthlyGoal || false,
          order: task.order,
        });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to save task to Supabase:', err);
    }
  },

  async deleteTaskFromSupabase(id: string) {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to delete task from Supabase:', err);
    }
  }
};

// Global sorting comparator based on requirements:
// 1. Rollover items first
// 2. High priority
// 3. Medium priority
// 4. Low priority
// 5. User manual order
// 6. Created date as fallback
export const sortTasks = (tasks: Task[]): Task[] => {
  return [...tasks].sort((a, b) => {
    // 1. Rollover tasks at the top
    const aRollover = a.status === 'rollover' ? 1 : 0;
    const bRollover = b.status === 'rollover' ? 1 : 0;
    if (aRollover !== bRollover) {
      return bRollover - aRollover; // rollover first
    }

    // 2. Priorities
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityWeight[a.priority] || 0;
    const bPriority = priorityWeight[b.priority] || 0;
    if (aPriority !== bPriority) {
      return bPriority - aPriority; // high priority first
    }

    // 3. User manual order
    if (a.order !== b.order) {
      return a.order - b.order;
    }

    // 4. Creation time
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
};
