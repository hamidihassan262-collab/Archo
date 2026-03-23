export type CaseStage = 'Lead' | 'Fact-Find' | 'Sourcing' | 'Application' | 'Offer' | 'Completion';

export type UserPlan = 'free' | 'pro' | 'company';
export type UserRole = 'broker' | 'admin';

export interface UserProfile {
  id: string;
  plan: UserPlan;
  company_id: string | null;
  role: UserRole;
  daily_message_count: number;
  weekly_message_count: number;
  last_message_date: string | null;
  email?: string;
  full_name?: string;
  onboarding_completed?: boolean;
  onboarding_case_management?: string;
  onboarding_pain_point?: string;
}

export interface Company {
  id: string;
  name: string;
  owner_id: string;
  member_limit: number;
  created_at: string;
}

export interface MortgageCase {
  id: string;
  clientName: string;
  propertyValue: number;
  loanAmount: number;
  ltv: number;
  stage: CaseStage;
  lastActionDate: string;
  ragStatus: 'Red' | 'Amber' | 'Green';
  assignedTo?: string;
  createdAt?: string;
}

export interface Lender {
  id: string;
  name: string;
  maxLTV: number;
  minIncome: number;
  selfEmployedPolicy: string;
  adverseCreditStance: string;
  isSpecialist?: boolean;
  lastUpdated: string;
}
