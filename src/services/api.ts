import { MortgageCase, Lender } from '../types';
import { supabase } from '../lib/supabase';

export async function fetchCases(): Promise<MortgageCase[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Supabase error fetching cases:', error);
    throw error;
  }
  
  return (data || []).map((item: any) => ({
    id: item.id,
    clientName: item.client_name,
    propertyValue: item.property_value,
    loanAmount: item.loan_amount,
    ltv: item.ltv,
    stage: item.stage.charAt(0).toUpperCase() + item.stage.slice(1), // Basic mapping
    lastActionDate: new Date(item.created_at).toISOString().split('T')[0],
    ragStatus: item.status_colour
  })) as MortgageCase[];
}

export async function createCase(data: any): Promise<MortgageCase> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // If not authenticated, we return a mock object to allow the UI to proceed (e.g. during onboarding/demo)
    console.warn('createCase called while unauthenticated. Returning mock data.');
    return {
      id: 'mock-' + Math.random().toString(36).substr(2, 9),
      clientName: data.client_name || 'Demo Client',
      propertyValue: data.property_value || 0,
      loanAmount: data.loan_amount || 0,
      ltv: data.ltv || 0,
      stage: (data.stage || 'Lead').charAt(0).toUpperCase() + (data.stage || 'Lead').slice(1),
      lastActionDate: new Date().toISOString().split('T')[0],
      ragStatus: data.status_colour || 'Green'
    } as MortgageCase;
  }

  const { data: created, error } = await supabase
    .from('cases')
    .insert([{ ...data, user_id: user.id }])
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
    .select('*')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Supabase error fetching lenders:', error);
    throw error;
  }
  
  return (data || []).map((l: any) => ({
    id: l.id,
    name: l.name,
    maxLTV: l.max_ltv,
    minIncome: l.min_income,
    selfEmployedPolicy: l.self_employed_policy,
    adverseCreditStance: l.adverse_credit_stance,
    isSpecialist: l.is_specialist,
    lastUpdated: new Date(l.updated_at || l.created_at).toLocaleDateString()
  })) as Lender[];
}
