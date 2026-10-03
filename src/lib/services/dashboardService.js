import { db } from '../db';

export const dashboardService = {
  async getTodayDashboardData() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Tasks due today (checklist items)
      // Note: Needs index on due_date or simple filtering
      const checklistItems = await db.checklist_items.toArray();
      const tasksDueToday = checklistItems.filter(
        item => item.due_date && item.due_date.startsWith(today) && !item.is_completed
      );
        
      // Routines for today
      const allRoutines = await db.routine_entries.toArray();
      const routines = allRoutines.filter(
        entry => entry.entry_date && entry.entry_date.startsWith(today)
      );
        
      // Recent notes
      const recentNotes = await db.notes
        .orderBy('updated_at')
        .reverse()
        .filter(note => !note.is_deleted && !note.is_archived)
        .limit(5)
        .toArray();
        
      return {
        tasksDueToday,
        routines,
        recentNotes
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }
};
