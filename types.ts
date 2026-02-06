
export enum CampaignStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  SCHEDULED = 'SCHEDULED',
  SENDING = 'SENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum TemplateCategory {
  MARKETING = 'MARKETING',
  UTILITY = 'UTILITY',
  AUTHENTICATION = 'AUTHENTICATION'
}

export interface ApiConfig {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  isConfigured: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  lastInteracted?: string;
  optInDate: string;
  tags: string[];
}

export interface Campaign {
  id: string;
  name: string;
  messageText: string;
  category: TemplateCategory;
  status: CampaignStatus;
  sentCount: number;
  openCount: number;
  totalContacts: number;
  createdAt: string;
  complianceScore?: number;
}

export interface ComplianceCheck {
  score: number;
  isCompliant: boolean;
  suggestions: string[];
  warnings: string[];
}
