'use client';
import { supabase } from './supabase';

export const DB = {
  _uid(userId) { return userId; },

  _cls(r) {
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      professor: r.professor || '',
      color: r.color || '#16a34a',
      icon: r.icon || 'book-open',
    };
  },

  _asgn(r) {
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      classId: r.class_id,
      dueDate: r.due_date,
      dueTime: r.due_time || '23:59',
      priority: r.priority || 'medium',
      estimatedTime: r.estimated_time || '1.5',
      notes: r.notes || '',
      completed: r.completed || false,
    };
  },

  async getClasses(userId) {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at');
      if (error) { console.error(error); return []; }
      return (data || []).map(r => this._cls(r));
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async addClass(userId, obj) {
    const { data, error } = await supabase
      .from('classes')
      .insert({
        user_id: userId,
        name: obj.name,
        professor: obj.professor || '',
        color: obj.color || '#16a34a',
        icon: obj.icon || 'book-open',
      })
      .select()
      .single();
    if (error) throw error;
    return this._cls(data);
  },

  async updateClass(userId, id, obj) {
    const { data, error } = await supabase
      .from('classes')
      .update({ name: obj.name, professor: obj.professor || '', color: obj.color, icon: obj.icon })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return this._cls(data);
  },

  async deleteClass(id) {
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) throw error;
  },

  async getAssignments(userId) {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId)
        .order('due_date');
      if (error) { console.error(error); return []; }
      return (data || []).map(r => this._asgn(r));
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async addAssignment(userId, obj) {
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        user_id: userId,
        class_id: obj.classId || null,
        name: obj.name,
        due_date: obj.dueDate,
        due_time: obj.dueTime || '23:59',
        priority: obj.priority || 'medium',
        estimated_time: obj.estimatedTime || '1.5',
        notes: obj.notes || '',
        completed: false,
      })
      .select()
      .single();
    if (error) throw error;
    return this._asgn(data);
  },

  async updateAssignment(id, obj) {
    const patch = {};
    if (obj.name !== undefined) patch.name = obj.name;
    if (obj.classId !== undefined) patch.class_id = obj.classId;
    if (obj.dueDate !== undefined) patch.due_date = obj.dueDate;
    if (obj.dueTime !== undefined) patch.due_time = obj.dueTime;
    if (obj.priority !== undefined) patch.priority = obj.priority;
    if (obj.estimatedTime !== undefined) patch.estimated_time = obj.estimatedTime;
    if (obj.notes !== undefined) patch.notes = obj.notes;
    if (obj.completed !== undefined) patch.completed = obj.completed;
    const { data, error } = await supabase
      .from('assignments')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return this._asgn(data);
  },

  async deleteAssignment(id) {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) throw error;
  },

  async toggleComplete(id, currentState) {
    return this.updateAssignment(id, { completed: !currentState });
  },

  computeStats(assignments) {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const toD = s => { const d = new Date(s + 'T00:00:00'); d.setHours(0, 0, 0, 0); return d; };
    const wk = new Date(now); wk.setDate(wk.getDate() + 7);
    return {
      dueToday: assignments.filter(a => !a.completed && toD(a.dueDate).getTime() === now.getTime()).length,
      dueThisWeek: assignments.filter(a => { const d = toD(a.dueDate); return !a.completed && d >= now && d < wk; }).length,
      upcoming: assignments.filter(a => !a.completed).length,
      completed: assignments.filter(a => a.completed).length,
    };
  },

  todayStr() { return new Date().toISOString().split('T')[0]; },

  getReminders(userId) {
    try {
      const key = `duee_rem_${userId || 'guest'}`;
      return JSON.parse(localStorage.getItem(key)) || {
        enabled: true,
        reminderTime: '1 day before',
        types: { dueToday: true, dueTomorrow: true, dueThisWeek: true, overdue: true },
      };
    } catch { return { enabled: true, reminderTime: '1 day before', types: { dueToday: true, dueTomorrow: true, dueThisWeek: true, overdue: true } }; }
  },

  saveReminders(userId, v) {
    const key = `duee_rem_${userId || 'guest'}`;
    localStorage.setItem(key, JSON.stringify(v));
  },

  getPreferences(userId) {
    try {
      const key = `duee_prefs_${userId || 'guest'}`;
      return JSON.parse(localStorage.getItem(key)) || { theme: 'light', weekStartDay: 'Monday', timeFormat: '12 Hour' };
    } catch { return { theme: 'light', weekStartDay: 'Monday', timeFormat: '12 Hour' }; }
  },

  savePreferences(userId, v) {
    const key = `duee_prefs_${userId || 'guest'}`;
    localStorage.setItem(key, JSON.stringify(v));
  },

  async resetAllData(userId) {
    const { error: asgnErr } = await supabase
      .from('assignments')
      .delete()
      .eq('user_id', userId);
    if (asgnErr) throw asgnErr;

    const { error: clsErr } = await supabase
      .from('classes')
      .delete()
      .eq('user_id', userId);
    if (clsErr) throw clsErr;

    // Clear localStorage prefs too
    localStorage.removeItem(`duee_rem_${userId}`);
    localStorage.removeItem(`duee_prefs_${userId}`);
  },
};
