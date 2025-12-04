export type Language = 'ja' | 'en';

export interface UserSongInput {
  artist: string;
  title: string;
}

export interface AnalysisResult {
  inferredEmotion: string; // AIが推測した感情
  analysisText: string; // なぜそう分析したかの解説
  moodColor: string; // Hex code
  imagePrompt: string;
}

export interface Memory {
  id: string;
  content: string; // 日記の内容 (任意)
  moodScore: number; // -50 (Cool/Sad) to +50 (Warm/Happy)
  moodTags: string[]; // 選択された感情タグ
  timestamp: number;
  song: UserSongInput; // ユーザーが入力した曲
  analysis: AnalysisResult; // AIによる分析結果
  imageUrl?: string; // Base64 or URL
  userFeedback?: 'correct' | 'incorrect' | null; // ユーザーの自己判断 (〇/×)
  language?: Language; // 記録時の言語
}