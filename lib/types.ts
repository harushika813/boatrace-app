export type ExtractedData = {
  odds?: (number | null)[] | null;
  place_odds?: ([number, number] | null)[] | null;
  exhibition_time?: (number | null)[] | null;
  st?: (string | null)[] | null;
  course_win_rate?: (number | null)[] | null;
  notes?: string[];
  analysis_md?: string;
};

export type PrevContext = {
  extracted: ExtractedData;
  mode1: string;
  mode2: string;
  venue?: string;
  raceNo?: string;
};

export type LogEntry = { date: string; text: string };
