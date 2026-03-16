export type CaseStage = 'Lead' | 'Fact-Find' | 'Sourcing' | 'Application' | 'Offer' | 'Completion';

export interface MortgageCase {
  id: string;
  clientName: string;
  propertyValue: number;
  loanAmount: number;
  ltv: number;
  stage: CaseStage;
  lastActionDate: string;
  ragStatus: 'Red' | 'Amber' | 'Green';
}

export interface Lender {
  id: string;
  name: string;
  maxLTV: number;
  minIncome: number;
  selfEmployedPolicy: string;
  adverseCreditStance: string;
  lastUpdated: string;
}
