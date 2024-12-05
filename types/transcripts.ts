export enum TranscriptType {
  TRANSCRIPT = 'transcript',
  TWITCH = 'twitch',
  SYSTEM = 'system'
}

export interface Transcript {
  id?: string;
  user_id?: string;
  text: string;
  type: TranscriptType;
  timestamp: string;
  created_at?: string;
} 