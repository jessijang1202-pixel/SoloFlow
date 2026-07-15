import { supabase } from './supabaseClient';

export interface Milestone {
  id: string;
  title: string;          // Milestone stage name (e.g., UI Design, Prototype)
  targetDate: string;     // Planned deadline (YYYY-MM-DD)
  completedAt: string | null; // Actual completion date
  note?: string;          // Optional description
}

export interface Category {
  id: string;
  name: string;
  color: string; // CSS color or HEX
  isSystem: boolean; // Cannot be deleted
  // Project extensions
  isProject?: boolean;
  description?: string;
  milestones?: Milestone[];
  synced?: boolean;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-dev', name: '앱개발', color: '#3b82f6', isSystem: true, isProject: true, milestones: [] },
  { id: 'cat-news', name: '인터넷신문', color: '#10b981', isSystem: true, isProject: false, milestones: [] },
  { id: 'cat-youtube', name: '유튜브', color: '#ef4444', isSystem: true, isProject: true, milestones: [] },
  { id: 'cat-sns', name: 'SNS 마케팅', color: '#ec4899', isSystem: true, isProject: false, milestones: [] },
  { id: 'cat-personal', name: '개인일정', color: '#f59e0b', isSystem: true, isProject: false, milestones: [] },
  { id: 'cat-lecture', name: '공연/강연', color: '#8b5cf6', isSystem: true, isProject: true, milestones: [] },
  { id: 'cat-other', name: '기타', color: '#6b7280', isSystem: true, isProject: false, milestones: [] },
];

const LOCAL_STORAGE_KEY = 'soloflow_categories';

export const categoryService = {
  getCategories(): Category[] {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    // Backward compatibility check
    const categories = JSON.parse(data) as Category[];
    const migrated = categories.map(c => ({
      ...c,
      isProject: c.isProject !== undefined ? c.isProject : false,
      milestones: c.milestones || [],
    }));
    return migrated;
  },

  saveCategories(categories: Category[]): void {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(categories));
  },

  addCategory(name: string, color: string, isProject = false, description = ''): Category {
    const categories = this.getCategories();
    const newCategory: Category = {
      id: `cat-custom-${Date.now()}`,
      name,
      color,
      isSystem: false,
      isProject,
      description,
      milestones: [],
      synced: false,
    };
    categories.push(newCategory);
    this.saveCategories(categories);
    this.saveCategoryToSupabase(newCategory);
    return newCategory;
  },

  updateCategory(id: string, name: string, color: string, isProject?: boolean, description?: string): Category[] {
    let categories = this.getCategories();
    categories = categories.map((cat) =>
      cat.id === id
        ? {
            ...cat,
            name,
            color,
            isProject: isProject !== undefined ? isProject : cat.isProject,
            description: description !== undefined ? description : cat.description,
            synced: false,
          }
        : cat
    );
    this.saveCategories(categories);
    const updated = categories.find(c => c.id === id);
    if (updated) this.saveCategoryToSupabase(updated);
    return categories;
  },

  deleteCategory(id: string): Category[] {
    let categories = this.getCategories();
    categories = categories.filter((cat) => cat.id !== id || cat.isSystem);
    this.saveCategories(categories);
    this.deleteCategoryFromSupabase(id);
    return categories;
  },

  // Toggle category project status
  toggleProjectMode(id: string, isProject: boolean, description = ''): Category[] {
    const categories = this.getCategories();
    const updated = categories.map(cat => {
      if (cat.id === id) {
        return {
          ...cat,
          isProject,
          description: isProject ? description || cat.description || '' : '',
          milestones: isProject ? cat.milestones || [] : [],
          synced: false,
        };
      }
      return cat;
    });
    this.saveCategories(updated);
    const updatedCat = updated.find(c => c.id === id);
    if (updatedCat) this.saveCategoryToSupabase(updatedCat);
    return updated;
  },

  updateCategoryMilestones(categoryId: string, milestones: Milestone[]): Category[] {
    const categories = this.getCategories();
    const updated = categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          milestones,
          synced: false,
        };
      }
      return cat;
    });
    this.saveCategories(updated);
    const updatedCat = updated.find(c => c.id === categoryId);
    if (updatedCat) this.saveCategoryToSupabase(updatedCat);
    return updated;
  },

  // Add a manual milestone to a project
  addMilestone(categoryId: string, title: string, targetDate: string, note = ''): Category[] {
    const categories = this.getCategories();
    const updated = categories.map(cat => {
      if (cat.id === categoryId) {
        const milestones = cat.milestones || [];
        const newMilestone: Milestone = {
          id: `ms-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          title,
          targetDate,
          completedAt: null,
          note,
        };
        return {
          ...cat,
          milestones: [...milestones, newMilestone].sort((a, b) => a.targetDate.localeCompare(b.targetDate)),
          synced: false,
        };
      }
      return cat;
    });
    this.saveCategories(updated);
    const updatedCat = updated.find(c => c.id === categoryId);
    if (updatedCat) this.saveCategoryToSupabase(updatedCat);
    return updated;
  },

  // Delete a milestone
  deleteMilestone(categoryId: string, milestoneId: string): Category[] {
    const categories = this.getCategories();
    const updated = categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          milestones: (cat.milestones || []).filter(ms => ms.id !== milestoneId),
          synced: false,
        };
      }
      return cat;
    });
    this.saveCategories(updated);
    const updatedCat = updated.find(c => c.id === categoryId);
    if (updatedCat) this.saveCategoryToSupabase(updatedCat);
    return updated;
  },

  // Update a milestone
  updateMilestone(
    categoryId: string,
    milestoneId: string,
    updatedFields: Partial<Omit<Milestone, 'id'>>
  ): Category[] {
    const categories = this.getCategories();
    const updated = categories.map(cat => {
      if (cat.id === categoryId) {
        const milestones = (cat.milestones || []).map(ms => {
          if (ms.id === milestoneId) {
            return { ...ms, ...updatedFields };
          }
          return ms;
        });
        return {
          ...cat,
          milestones: milestones.sort((a, b) => a.targetDate.localeCompare(b.targetDate)),
          synced: false,
        };
      }
      return cat;
    });
    this.saveCategories(updated);
    const updatedCat = updated.find(c => c.id === categoryId);
    if (updatedCat) this.saveCategoryToSupabase(updatedCat);
    return updated;
  },

  // Parsing CSV string into milestone objects
  parseCSVToMilestones(csvText: string): Omit<Milestone, 'id' | 'completedAt'>[] {
    const lines = csvText.split(/\r?\n/);
    const parsed: Omit<Milestone, 'id' | 'completedAt'>[] = [];
    
    // YYYY-MM-DD RegEx validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const columns = line.split(',').map(col => col.replace(/^["']|["']$/g, '').trim());
      if (columns.length === 0 || !columns[0]) continue;

      let title = columns[0];
      let date = columns[1] || '';
      let note = columns[2] || '';

      // Skip header row if it exists
      if (i === 0 && (title.toLowerCase().includes('name') || title.toLowerCase().includes('단계') || title.toLowerCase().includes('목표'))) {
        continue;
      }

      // If date format is wrong, attempt basic auto-fixes or default to today
      if (!dateRegex.test(date)) {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate() + (i * 3)).padStart(2, '0'); // offset dates dynamically
        date = `${y}-${m}-${day}`;
      }

      parsed.push({
        title,
        targetDate: date,
        note,
      });
    }

    return parsed;
  },

  // Simulation of image analysis OCR
  generateMockMilestonesFromImage(): Omit<Milestone, 'id' | 'completedAt'>[] {
    const today = new Date();
    const getOffsetDate = (days: number): string => {
      const d = new Date(today);
      d.setDate(today.getDate() + days);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    return [
      { title: '단계 1: 아이디어 검증 및 세부 기획 완료', targetDate: getOffsetDate(3), note: '문서화 및 요구사항 수집' },
      { title: '단계 2: UI/UX 와이어프레임 설계안 완성', targetDate: getOffsetDate(10), note: '메인 화면 스케치 및 프로토타입 피드백' },
      { title: '단계 3: 핵심 퍼블리싱 및 데이터 연동 완료', targetDate: getOffsetDate(20), note: '프론트엔드-백엔드 데이터 모델 결합' },
      { title: '단계 4: 베타 테스트 및 버그 대대적 수집', targetDate: getOffsetDate(27), note: '동작 점검 및 로컬 스토리지 데이터 무결성 체크' },
      { title: '단계 5: 최종 론칭 및 유저 홍보 개시', targetDate: getOffsetDate(35), note: '앱마켓 등록 및 SNS 마케팅 홍보' },
    ];
  },

  getSupabaseClient() {
    return supabase;
  },

  async syncWithSupabase(): Promise<Category[]> {
    if (!supabase) {
      return this.getCategories();
    }
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*');
      if (error) throw error;
      
      const localCats = this.getCategories();
      const remoteCats: Category[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        color: item.color,
        isSystem: item.is_system,
        isProject: item.is_project,
        description: item.description || '',
        milestones: item.milestones || [],
        synced: true,
      }));

      // Merging: combine local and remote using category ID as key
      const mergedMap = new Map<string, Category>();
      remoteCats.forEach(rc => {
        mergedMap.set(rc.id, rc);
      });

      let localHasNew = false;
      let hasChanges = false;

      // Process local categories
      for (const lc of localCats) {
        if (!mergedMap.has(lc.id)) {
          // If local category is not in remote database
          if (lc.isSystem) {
            // Keep system categories
            mergedMap.set(lc.id, lc);
          } else if (lc.synced) {
            // Previously synced, so it was deleted on another client
            hasChanges = true;
          } else {
            // New local category, upload it
            mergedMap.set(lc.id, lc);
            localHasNew = true;
            await this.saveCategoryToSupabase(lc);
          }
        } else {
          // Category exists in both. Compare fields (excluding synced flag)
          const rc = mergedMap.get(lc.id)!;
          
          const normalize = (c: Category) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            isSystem: c.isSystem,
            isProject: c.isProject,
            description: c.description,
            milestones: c.milestones,
          });

          if (JSON.stringify(normalize(lc)) !== JSON.stringify(normalize(rc))) {
            if (lc.synced === false) {
              // Local version has pending updates! Upload local version to remote.
              mergedMap.set(lc.id, lc);
              localHasNew = true;
              await this.saveCategoryToSupabase(lc);
            } else {
              hasChanges = true;
            }
          }
        }
      }

      // Check if remote had categories that local did not have
      remoteCats.forEach(rc => {
        if (!localCats.some(lc => lc.id === rc.id)) {
          hasChanges = true;
        }
      });

      const mergedList = Array.from(mergedMap.values());
      if (hasChanges || localHasNew) {
        this.saveCategories(mergedList);
      }
      return mergedList;
    } catch (err: any) {
      console.error('Failed to sync categories with Supabase:', err?.message, err?.details, err?.hint, err);
    }
    return this.getCategories();
  },

  async saveCategoryToSupabase(cat: Category) {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('categories')
        .upsert({
          id: cat.id,
          name: cat.name,
          color: cat.color,
          is_system: cat.isSystem,
          is_project: cat.isProject || false,
          description: cat.description || '',
          milestones: cat.milestones || [],
        });
      if (error) throw error;

      // Update local storage to mark as synced
      const categories = this.getCategories();
      const updated = categories.map(c => c.id === cat.id ? { ...c, synced: true } : c);
      this.saveCategories(updated);
    } catch (err: any) {
      console.error('Failed to save category to Supabase:', err?.message, err?.details, err?.hint, err);
    }
  },

  async deleteCategoryFromSupabase(id: string) {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to delete category from Supabase:', err);
    }
  }
};
