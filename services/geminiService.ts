import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, UserSongInput, Language } from "../types";

const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

const getAnalysisSchema = (lang: Language): Schema => {
  const isJa = lang === 'ja';
  return {
    type: Type.OBJECT,
    properties: {
      inferredEmotion: { 
        type: Type.STRING, 
        description: isJa 
          ? "その曲を聞きながらその時の気分のユーザーの「一言で表す感情・ムード」。例：静かな決意、安らぎ、憂鬱な雨、高揚感など。" 
          : "A short phrase describing the user's emotion/mood based on the song and context. E.g., Quiet Determination, Peaceful, Melancholy Rain, Euphoria."
      },
      analysisText: { 
        type: Type.STRING, 
        description: isJa
          ? "ユーザーへの共感あふれるメッセージ。音楽の専門知識（歌詞のフレーズや曲調の展開など）を交えつつ、ユーザーのその日の気持ち（日記、タグ、スコア）に優しく寄り添う内容にする。「〜という歌詞が今の気持ちに重なりますね」「このピアノの旋律が〜」のように具体的に。"
          : "A warm, empathetic message to the user. Combine musical expertise (lyrics, melody, progression) with the user's feelings (diary, tags, score). Be specific like 'The lyrics about... resonate with your mood' or 'The piano melody...'."
      },
      moodColor: { 
        type: Type.STRING, 
        description: "Hex code representing the mood (e.g., #3b82f6)." 
      },
      imagePrompt: {
        type: Type.STRING, 
        description: "English prompt for generating minimalist, abstract artwork blending the song's vibe and user's emotion. Use the moodColor as reference." 
      },
    },
    required: ["inferredEmotion", "analysisText", "moodColor", "imagePrompt"],
  };
};

export const analyzeMemory = async (
  diaryText: string, 
  song: UserSongInput, 
  moodScore: number, 
  moodTags: string[],
  date: Date,
  lang: Language
): Promise<AnalysisResult> => {
  try {
    const isJa = lang === 'ja';
    const formattedDate = date.toLocaleDateString(isJa ? 'ja-JP' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // Context description based on language
    const moodDescription = moodScore < 0 
      ? (isJa ? `静的・低温・憂鬱 (${moodScore})` : `Static/Cool/Melancholy (${moodScore})`)
      : (isJa ? `動的・高温・高揚 (${moodScore})` : `Dynamic/Warm/Euphoric (${moodScore})`);

    const promptContext = isJa 
      ? `
        ユーザーが「${formattedDate}」の記録として「思い出の曲」と「その時の気分」を入力しました。
        この曲の【歌詞】や【メロディ・曲調】の特徴を踏まえ、ユーザーの心に寄り添う温かいメッセージを送ってください。
        
        【入力情報】
        日付: ${formattedDate}
        曲名: ${song.title}
        アーティスト: ${song.artist}
        ムードスコア (-50が静/悲、+50が動/喜): ${moodScore} (${moodDescription})
        選択された感情タグ: ${moodTags.join(', ')}
        日記/メモの内容: "${diaryText || '（特になし）'}"
        
        あなたはユーザーの感情を深く理解し、肯定する温かい存在（深夜ラジオのパーソナリティや、親しい文通相手のような）です。
        
        【重要な指針】
        1. **楽曲分析の深化**: ただ「いい曲ですね」と言うのではなく、「この曲の『〜』という歌詞が…」や「サビに向かって盛り上がる転調が…」のように、曲の具体的な要素（歌詞やサウンド）を引き合いに出して、それがユーザーの感情とどうリンクしているかを語ってください。
        2. 時間軸の混乱回避: 「過去のことですね」等の言及は避け、「${formattedDate}という日」の体験として現在進行形のように寄り添ってください。
        3. 否定厳禁: どんなに暗い感情であっても、それを否定せず、「そういう時もありますよね」「その感情も大切ですね」と受け止めてください。
        
        出力は日本語で行ってください。文体は「です・ます」調で、優しく、包容力のあるトーンでお願いします。
      `
      : `
        The user has recorded a "Memory Song" and "Mood" for the date "${formattedDate}".
        Based on the song's [Lyrics] and [Melody/Vibe], provide a warm message that resonates with the user's heart.

        [Input Info]
        Date: ${formattedDate}
        Song: ${song.title}
        Artist: ${song.artist}
        Mood Score (-50 is Quiet/Sad, +50 is Active/Happy): ${moodScore} (${moodDescription})
        Selected Tags: ${moodTags.join(', ')}
        Diary Note: "${diaryText || '(None)'}"

        You are a warm, understanding presence (like a late-night radio DJ or a close pen pal) who deeply understands and affirms the user's emotions.

        [Important Guidelines]
        1. **Deep Musical Analysis**: Don't just say "It's a good song." Refer to specific elements like "The lyrics about '...'" or "The key change in the chorus..." and explain how they link to the user's current emotion.
        2. Time Context: Treat this as an experience of "the day of ${formattedDate}" and empathize with it as if it's fresh.
        3. No Negativity: Even if the emotion is dark, do not deny it. Accept it gently, saying things like "It's okay to feel this way sometimes."

        Output MUST be in English. Use a gentle, polite, and embracing tone.
      `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptContext,
      config: {
        responseMimeType: "application/json",
        responseSchema: getAnalysisSchema(lang),
        systemInstruction: isJa 
          ? "あなたは音楽のソムリエであり、心理カウンセラーのような包容力を持つAIです。"
          : "You are an AI with the inclusivity of a music sommelier and a psychological counselor.",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AnalysisResult;
  } catch (error) {
    console.error("Error analyzing memory:", error);
    // Fallback
    const isJa = lang === 'ja';
    return {
      inferredEmotion: isJa ? "解析不能" : "Analysis Failed",
      analysisText: isJa 
        ? "申し訳ありません、分析中にエラーが発生しました。もう少し時間を置いてから試してみてください。"
        : "Sorry, an error occurred during analysis. Please try again in a moment.",
      moodColor: "#cbd5e1",
      imagePrompt: "abstract minimalist geometric art, soft colors",
    };
  }
};

export const generateMemoryImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: `Minimalist, modern abstract art. High quality, serene atmosphere. Use warm, organic shapes. ${prompt}` }],
      },
      config: {
         // Default 1:1 aspect ratio
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating image:", error);
    return ""; 
  }
};
