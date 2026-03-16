import { MortgageCase, Lender } from '../types';
import { supabase } from '../lib/supabase';

export async function fetchCases(): Promise<MortgageCase[]> {
  const { data, error } = await supabase
    .from('cases')
    .select('*');
  
  if (error) {
    console.error('Supabase error fetching cases:', error);
    throw error;
  }
  
  return (data || []) as MortgageCase[];
}

export async function createCase(data: Partial<MortgageCase>): Promise<MortgageCase> {
  const { data: created, error } = await supabase
    .from('cases')
    .insert([data])
    .select()
    .single();
  
  if (error) {
    console.error('Supabase error creating case:', error);
    throw error;
  }
  
  return created as MortgageCase;
}

export async function fetchLenders(): Promise<Lender[]> {
  const { data, error } = await supabase
    .from('lenders')
    .select('*');
  
  if (error) {
    console.error('Supabase error fetching lenders:', error);
    throw error;
  }
  
  return (data || []) as Lender[];
}
