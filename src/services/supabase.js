import { createClient } from '@supabase/supabase-js';

// New Supabase project credentials
const supabaseUrl = "https://usjzgoezzlzzdnqdbykl.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzanpnb2V6emx6emRucWRieWtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1OTMwMzcsImV4cCI6MjA5MDE2OTAzN30.x5Qo2xYONMhoLgFDLxkhzPnV-HAr23WsjvkEQiyOftI";

export const supabase = createClient(supabaseUrl, supabaseKey);


// -------- Daily Entries --------
export async function addDailyEntry(entry) {
  const { data: { user } } = await supabase.auth.getUser();
  const entryData = user && user.email !== 'admin' ? { ...entry, user_id: user.id } : entry;
  
  const { data, error } = await supabase.from("daily_entries").insert([entryData]);
  if (error) throw error;
  return data;
}

export async function getDailyEntries() {
  const { data: { user } } = await supabase.auth.getUser();
  
  let query = supabase.from("daily_entries").select("*");
  
  // Filter by user_id for regular users, show all for admin
  if (user && user.email !== 'admin') {
    query = query.eq('user_id', user.id);
  }
  
  const { data, error } = await query.order("entry_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function updateDailyEntry(id, entry) {
  const { data, error } = await supabase.from("daily_entries").update(entry).eq("id", id);
  if (error) throw error;
  return data;
}

// -------- Weekly Targets --------
export async function addWeeklyTarget(target) {
  const { data: { user } } = await supabase.auth.getUser();
  const targetData = user && user.email !== 'admin' ? { ...target, user_id: user.id } : target;
  
  const { data, error } = await supabase.from("weekly_targets").insert([targetData]);
  if (error) throw error;
  return data;
}

export async function getWeeklyTargets() {
  const { data: { user } } = await supabase.auth.getUser();
  
  let query = supabase.from("weekly_targets").select("*");
  
  // Filter by user_id for regular users, show all for admin
  if (user && user.email !== 'admin') {
    query = query.eq('user_id', user.id);
  }
  
  const { data, error } = await query.order("week_number", { ascending: true });
  if (error) throw error;
  return data;
}

// -------- Reminders --------
export async function addReminder(reminder) {
  const { data: { user } } = await supabase.auth.getUser();
  const reminderData = user && user.email !== 'admin' ? { ...reminder, user_id: user.id } : reminder;
  
  const { data, error } = await supabase.from("reminders").insert([reminderData]);
  if (error) throw error;
  return data;
}

export async function getReminders() {
  const { data: { user } } = await supabase.auth.getUser();
  
  let query = supabase.from("reminders").select("*");
  
  // Filter by user_id for regular users, show all for admin
  if (user && user.email !== 'admin') {
    query = query.eq('user_id', user.id);
  }
  
  const { data, error } = await query.order("day", { ascending: true });
  if (error) throw error;
  return data;
}

export async function updateReminder(id, reminder) {
  const { data, error } = await supabase.from("reminders").update(reminder).eq("id", id);
  if (error) throw error;
  return data;
}

export async function deleteReminder(id) {
  const { data, error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) throw error;
  return data;
}

// -------- Progress Photos --------
export async function getProgressPhotos(date) {
  const { data: { user } } = await supabase.auth.getUser();
  
  let query = supabase
    .from('progress_photos')
    .select('*')
    .eq('photo_date', date);
  
  if (user && user.email !== 'admin') {
    query = query.eq('user_id', user.id);
  }
  
  const { data, error } = await query.single();
  return { data, error };
}

export async function saveProgressPhotos(photoData) {
  const { data: { user } } = await supabase.auth.getUser();
  const dataWithUser = user && user.email !== 'admin' ? { ...photoData, user_id: user.id } : photoData;
  
  const { data, error } = await supabase
    .from('progress_photos')
    .upsert(dataWithUser);
  return { data, error };
}

// -------- Body Measurements --------
export async function getBodyMeasurements() {
  const { data: { user } } = await supabase.auth.getUser();
  
  let query = supabase.from('body_measurements').select('*');
  
  if (user && user.email !== 'admin') {
    query = query.eq('user_id', user.id);
  }
  
  const { data, error } = await query.order('measurement_date', { ascending: true });
  if (error) throw error;
  return data;
}

export async function saveBodyMeasurements(measurementData) {
  const { data: { user } } = await supabase.auth.getUser();
  const dataWithUser = user && user.email !== 'admin' ? { ...measurementData, user_id: user.id } : measurementData;
  
  const { data, error } = await supabase
    .from('body_measurements')
    .upsert(dataWithUser);
  if (error) throw error;
  return data;
}
