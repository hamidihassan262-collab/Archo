import { supabase } from '../lib/supabase';
import { UserProfile, UserPlan } from '../types';

export const FREE_DAILY_LIMIT = 5;
export const FREE_CASE_LIMIT = 3;

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Profile doesn't exist, create one
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert([{ id: userId, plan: 'free', role: 'broker' }])
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating profile:', createError);
        return null;
      }
      return newProfile;
    }
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

export async function incrementMessageCount(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  if (!profile) return false;

  if (profile.plan !== 'free') return true;

  const now = new Date();
  const lastDate = profile.last_message_date ? new Date(profile.last_message_date) : null;
  
  let dailyCount = profile.daily_message_count;
  let weeklyCount = profile.weekly_message_count;

  // Reset daily if it's a new day
  if (!lastDate || lastDate.toDateString() !== now.toDateString()) {
    dailyCount = 0;
  }

  // Reset weekly if it's a new week (Monday)
  const isMonday = now.getDay() === 1;
  if (isMonday && (!lastDate || lastDate.toDateString() !== now.toDateString())) {
    // This is a bit simplified, but checks if it's Monday and we haven't reset today
    // A more robust check would compare week numbers
    weeklyCount = 0;
  }

  if (dailyCount >= FREE_DAILY_LIMIT) {
    return false;
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      daily_message_count: dailyCount + 1,
      weekly_message_count: weeklyCount + 1,
      last_message_date: now.toISOString()
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating message count:', error);
    return false;
  }

  return true;
}

export async function checkCaseLimit(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  if (!profile) return false;

  if (profile.plan !== 'free') return true;

  const { count, error } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    console.error('Error checking case limit:', error);
    return false;
  }

  return (count || 0) < FREE_CASE_LIMIT;
}

export async function updatePlan(userId: string, plan: UserPlan): Promise<boolean> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ plan })
    .eq('id', userId);

  if (error) {
    console.error('Error updating plan:', error);
    return false;
  }

  return true;
}
