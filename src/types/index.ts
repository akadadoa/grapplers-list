export type CompetitionSource = "ibjjf" | "jjwl" | "agf" | "naga" | "adcc";

export interface Competition {
  id: string;
  source: CompetitionSource;
  name: string;
  startDate: string; // ISO string
  endDate?: string | null;
  location: string;
  lat?: number | null;
  lng?: number | null;
  registrationUrl: string;
  details?: string | null; // JSON string
  gi: boolean;
  nogi: boolean;
  kids: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FilterState {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
  region: string;
  sources: Record<CompetitionSource, boolean>;
  gi: boolean;
  nogi: boolean;
  adult: boolean;
  kids: boolean;
}
