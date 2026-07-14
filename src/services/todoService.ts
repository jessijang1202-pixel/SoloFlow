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
    return newTask;
  },

  updateTask(updatedTask: Task): Task[] {
    const tasks = this.getTasks();
    const newTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    this.saveTasks(newTasks);
    return newTasks;
  },

  deleteTask(id: string): Task[] {
    const tasks = this.getTasks();
    const newTasks = tasks.filter(t => t.id !== id);
    this.saveTasks(newTasks);
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
    return newTasks;
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
