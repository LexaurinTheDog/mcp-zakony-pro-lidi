/**
 * Types for the Zákony pro lidi MCP server
 */

export interface SearchResult {
  code: string;
  title: string;
  url: string;
  type: DocumentType;
  year?: number;
}

export interface LawDocument {
  code: string;
  title: string;
  fullText: string;
  url: string;
  effectiveDate?: string;
  sections?: Section[];
}

export interface Section {
  number: string;
  title?: string;
  text: string;
}

export interface LawChange {
  date: string;
  amendingLaw: string;
  description: string;
  type: ChangeType;
}

export type DocumentType = 'law' | 'treaty' | 'eu-law' | 'court-decision';
export type ChangeType = 'amendment' | 'repeal' | 'new-provision' | 'other';

export interface SearchParams {
  query: string;
  type?: DocumentType;
  year?: number;
  limit?: number;
}

export interface FetchLawParams {
  lawCode: string;
  section?: string;
}

export interface GetChangesParams {
  lawCode: string;
  dateFrom?: string;
}

export interface SearchSectionsParams {
  sectionNumber?: string;
  keyword?: string;
  lawCode?: string;
}
