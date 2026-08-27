'use client';
import { supabase } from './supabase';

export const Auth = {
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async signUp(email, password, name) {
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
  },

  async signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  },

  async signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://duee.online/dashboard' },
    });
  },

  async signOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  },

  async updatePassword(newPassword) {
    return supabase.auth.updateUser({ password: newPassword });
  },

  async updateProfile(name) {
    return supabase.auth.updateUser({ data: { name } });
  },

  async requireAuth() {
    const session = await this.getSession();
    if (!session) {
      window.location.href = '/login';
      return null;
    }
    return session;
  },

  getUserName(user) {
    return user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student';
  },

  getUserInitial(user) {
    return this.getUserName(user).charAt(0).toUpperCase();
  },
};
