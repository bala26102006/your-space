import { db } from '../db';

export async function getTodayDashboardData() {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const [dueTasks, routines, allNotes] = await Promise.all([
      db.checklist_items.where('due_date').equals(todayStr).toArray(),
      db.routine_entries.where('entry_date').equals(todayStr).toArray(),
      db.notes.toArray()
    ]);

    const tasksDueToday = dueTasks.filter(i => (i.item_type === 'task' || !i.item_type) && !i.is_completed);
    
    const routinesForToday = routines;

    const recentNotes = allNotes
      .filter(n => !n.is_archived && !n.is_deleted && !n.content?.isStarterKit)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 3);

    return {
      tasksDueToday,
      routinesForToday,
      recentNotes
    };
  } catch (error) {
    console.error('Error fetching today dashboard data:', error);
    return {
      tasksDueToday: [],
      routinesForToday: [],
      recentNotes: []
    };
  }
}
