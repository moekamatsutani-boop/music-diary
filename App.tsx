import React, { useState, useEffect } from 'react';
import { Memory, Language } from './types';
import { analyzeMemory, generateMemoryImage } from './services/geminiService';
import MemoryCard from './components/MemoryCard';
import { Sparkles, LayoutGrid, Calendar as CalendarIcon, PenLine, Loader2, Music, ChevronLeft, ChevronRight, BookHeart, History, Activity, Tag, Sun, CloudRain, RotateCcw, Globe } from 'lucide-react';

const STORAGE_KEY = 'music_diary_data_v1';

type ViewMode = 'list' | 'calendar';

interface TagDefinition {
  id: string;
  label: { ja: string; en: string };
}

// Universal emotion tags with IDs and translations
const EMOTION_TAGS: TagDefinition[] = [
  { id: 'relax', label: { ja: "リラックス", en: "Relax" } },
  { id: 'focus', label: { ja: "集中", en: "Focus" } },
  { id: 'blue', label: { ja: "憂鬱", en: "Blue" } },
  { id: 'excited', label: { ja: "ワクワク", en: "Excited" } },
  { id: 'nostalgic', label: { ja: "懐かしい", en: "Nostalgic" } },
  { id: 'determined', label: { ja: "決意", en: "Determined" } },
  { id: 'tired', label: { ja: "疲れた", en: "Tired" } },
  { id: 'grateful', label: { ja: "感謝", en: "Grateful" } },
  { id: 'angry', label: { ja: "怒り", en: "Angry" } },
  { id: 'calm', label: { ja: "穏やか", en: "Calm" } },
  { id: 'lonely', label: { ja: "孤独", en: "Lonely" } },
  { id: 'accomplished', label: { ja: "達成感", en: "Accomplished" } }
];

const UI_TEXT = {
  subtitle: { ja: "音楽と感情のライフログ", en: "Life log of music & emotions" },
  titleRecord: { ja: "思い出の曲を記録する", en: "Record a Memory Song" },
  descRecord: { ja: "心が動いた瞬間と、その時の音楽を残しておきましょう。", en: "Capture the moment your heart moved, along with the music." },
  labelDate: { ja: "日付", en: "Date" },
  labelMusic: { ja: "楽曲情報", en: "Music Info" },
  labelMood: { ja: "感情バロメーター", en: "Emotion Barometer" },
  labelTags: { ja: "キーワード", en: "Keywords" },
  labelDiary: { ja: "日記・メモ", en: "Diary Note" },
  placeholderSong: { ja: "曲名", en: "Song Title" },
  placeholderArtist: { ja: "アーティスト名", en: "Artist Name" },
  placeholderDiary: { ja: "今の気持ちや出来事を書き留めましょう（任意）", en: "Write down your feelings or what happened (optional)..." },
  btnReset: { ja: "入力をリセットしますか？", en: "Reset input?" },
  btnSave: { ja: "思い出を保存", en: "Save Memory" },
  analyzing: { ja: "分析中...", en: "Analyzing..." },
  stepAnalyzing: { ja: "音楽と感情を分析しています...", en: "Analyzing music and emotions..." },
  stepImage: { ja: "イメージを生成しています...", en: "Generating visual..." },
  timeline: { ja: "マイ・タイムライン", en: "My Timeline" },
  emptyTitle: { ja: "記録はまだありません", en: "No memories yet" },
  emptyDesc: { ja: "最初の1曲を記録してみましょう", en: "Let's record your first song." },
  errorMsg: { ja: "エラーが発生しました。しばらくしてから再度お試しください。", en: "An error occurred. Please try again later." },
  quiet: { ja: "静 / 冷", en: "Quiet / Cool" },
  active: { ja: "動 / 温", en: "Active / Warm" },
};

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const App: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [language, setLanguage] = useState<Language>('ja');
  
  // Inputs
  const [recordDate, setRecordDate] = useState(getTodayString());
  const [diaryText, setDiaryText] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [moodScore, setMoodScore] = useState(0); // -50 to 50
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentDate, setCurrentDate] = useState(new Date());

  const t = (key: keyof typeof UI_TEXT) => UI_TEXT[key][language];

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setMemories(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load memories", e);
      }
    }
  }, []);

  const saveMemories = (newMemories: Memory[]) => {
    setMemories(newMemories);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newMemories));
  };

  const deleteMemory = (id: string) => {
    const updatedMemories = memories.filter(m => m.id !== id);
    saveMemories(updatedMemories);
  };

  const handleReset = () => {
    if (window.confirm(t('btnReset'))) {
        setDiaryText('');
        setSongTitle('');
        setArtistName('');
        setMoodScore(0);
        setSelectedTags([]);
        setRecordDate(getTodayString());
    }
  };

  const toggleTag = (tagLabel: string) => {
    if (selectedTags.includes(tagLabel)) {
      setSelectedTags(selectedTags.filter(t => t !== tagLabel));
    } else {
      if (selectedTags.length < 3) {
        setSelectedTags([...selectedTags, tagLabel]);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!songTitle.trim() || !artistName.trim()) return;

    setIsAnalyzing(true);
    setLoadingStep(t('stepAnalyzing'));

    try {
      const [year, month, day] = recordDate.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);

      const analysis = await analyzeMemory(
        diaryText, 
        { title: songTitle, artist: artistName },
        moodScore,
        selectedTags,
        targetDate,
        language
      );
      
      setLoadingStep(t('stepImage'));
      const imageUrl = await generateMemoryImage(analysis.imagePrompt);

      const newMemory: Memory = {
        id: Date.now().toString(),
        content: diaryText,
        moodScore,
        moodTags: selectedTags,
        timestamp: targetDate.getTime(),
        song: {
          title: songTitle,
          artist: artistName
        },
        analysis: analysis,
        imageUrl: imageUrl,
        userFeedback: null,
        language: language
      };

      const updatedMemories = [newMemory, ...memories].sort((a, b) => b.timestamp - a.timestamp);

      saveMemories(updatedMemories);
      
      setRecordDate(getTodayString());
      setDiaryText('');
      setSongTitle('');
      setArtistName('');
      setMoodScore(0);
      setSelectedTags([]);
    } catch (error) {
      console.error(error);
      alert(t('errorMsg'));
    } finally {
      setIsAnalyzing(false);
      setLoadingStep('');
    }
  };

  const handleFeedback = (id: string, isCorrect: boolean) => {
    const updatedMemories = memories.map(m => {
      if (m.id === id) {
        return { ...m, userFeedback: isCorrect ? 'correct' : 'incorrect' as const };
      }
      return m;
    });
    saveMemories(updatedMemories);
  };

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
    setCurrentDate(new Date(newDate));
  };

  const getMemoriesForDate = (day: number) => {
    return memories.filter(m => {
      const mDate = new Date(m.timestamp);
      return mDate.getDate() === day && 
             mDate.getMonth() === currentDate.getMonth() && 
             mDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-28 bg-stone-50 border border-stone-100"></div>);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayMemories = getMemoriesForDate(day);
      const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday = new Date().toDateString() === checkDate.toDateString();

      days.push(
        <div key={day} className={`h-28 border border-stone-100 p-1 relative group hover:bg-white transition-colors ${isToday ? 'bg-white shadow-inner' : 'bg-stone-50/50'}`}>
          <span className={`absolute top-2 left-2 w-6 h-6 flex items-center justify-center text-xs rounded-full z-10 font-medium ${isToday ? 'bg-orange-500 text-white' : 'text-stone-400'}`}>
            {day}
          </span>
          
          <div className="w-full h-full pt-8 grid grid-cols-2 gap-1 content-start overflow-y-auto custom-scrollbar">
            {dayMemories.map((m) => (
              <div 
                key={m.id} 
                className="aspect-square rounded-md overflow-hidden relative cursor-pointer group/item shadow-sm border border-stone-100"
                title={`${m.song.title} - ${m.analysis.inferredEmotion}`}
              >
                {m.imageUrl ? (
                  <img src={m.imageUrl} alt="art" className="w-full h-full object-cover grayscale-[0.2] group-hover/item:grayscale-0 transition-all" />
                ) : (
                  <div className="w-full h-full bg-stone-100 flex items-center justify-center">
                    <Music size={12} className="text-stone-300" />
                  </div>
                )}
                 <div 
                   className="absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center p-1 bg-black/60 backdrop-blur-[1px]"
                 >
                   <p className="text-[9px] text-white text-center leading-tight font-medium">{m.analysis.inferredEmotion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="min-h-screen text-stone-700 selection:bg-orange-100 selection:text-orange-900 pb-20 font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel shadow-sm shadow-stone-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center shadow-md shadow-orange-100">
              <BookHeart className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-stone-800 tracking-tight">
              MusicDiary
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-xs font-medium text-stone-500">
              {t('subtitle')}
            </div>
            {/* Language Switch */}
            <div className="flex items-center bg-stone-100 rounded-full p-1 border border-stone-200">
                <button 
                    onClick={() => setLanguage('ja')}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${language === 'ja' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}
                >
                    JP
                </button>
                <button 
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${language === 'en' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}
                >
                    EN
                </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        
        {/* Input Section */}
        <section className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-medium text-stone-800 mb-3">
              {t('titleRecord')}
            </h2>
            <p className="text-stone-500 text-sm">
              {t('descRecord')}
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-stone-100 shadow-xl shadow-stone-200/50 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-300 via-rose-300 to-indigo-300"></div>
            
            <div className="p-6 md:p-10 space-y-10">

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Date Input */}
                <div className="md:col-span-4 space-y-4">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2 mb-1">
                        <CalendarIcon size={14} className="text-orange-400" /> {t('labelDate')}
                    </label>
                    <div className="group">
                      <input 
                        type="date" 
                        value={recordDate}
                        onChange={(e) => setRecordDate(e.target.value)}
                        max={getTodayString()}
                        className="w-full bg-stone-50 border border-stone-200 text-stone-800 placeholder-stone-400 px-5 py-3.5 rounded-xl outline-none focus:bg-white focus:border-orange-300 focus:ring-4 focus:ring-orange-50 transition-all text-sm group-hover:bg-stone-50/80 cursor-pointer"
                      />
                    </div>
                </div>

                {/* Song Input */}
                <div className="md:col-span-8 space-y-4">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2 mb-1">
                      <Music size={14} className="text-orange-400" /> {t('labelMusic')}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="group">
                          <input 
                            type="text" 
                            placeholder={t('placeholderSong')}
                            value={songTitle}
                            onChange={(e) => setSongTitle(e.target.value)}
                            className="w-full bg-stone-50 border border-stone-200 text-stone-800 placeholder-stone-400 px-5 py-3.5 rounded-xl outline-none focus:bg-white focus:border-orange-300 focus:ring-4 focus:ring-orange-50 transition-all text-sm group-hover:bg-stone-50/80"
                          />
                      </div>
                      <div className="group">
                          <input 
                            type="text" 
                            placeholder={t('placeholderArtist')}
                            value={artistName}
                            onChange={(e) => setArtistName(e.target.value)}
                            className="w-full bg-stone-50 border border-stone-200 text-stone-800 placeholder-stone-400 px-5 py-3.5 rounded-xl outline-none focus:bg-white focus:border-orange-300 focus:ring-4 focus:ring-orange-50 transition-all text-sm group-hover:bg-stone-50/80"
                          />
                      </div>
                  </div>
                </div>
              </div>

              {/* Mood Slider */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2 mb-1">
                    <Activity size={14} className="text-orange-400" /> {t('labelMood')}
                </label>
                <div className="bg-stone-50/50 rounded-2xl p-6 border border-stone-100">
                  <div className="relative h-12 flex items-center">
                    <CloudRain className="absolute left-0 text-indigo-300 w-5 h-5" />
                    <Sun className="absolute right-0 text-orange-400 w-5 h-5" />
                    
                    <input 
                        type="range" 
                        min="-50" 
                        max="50" 
                        value={moodScore} 
                        onChange={(e) => setMoodScore(parseInt(e.target.value))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-indigo-100 via-stone-200 to-orange-100 mx-8 accent-orange-500"
                    />
                  </div>
                  <div className="flex justify-between text-xs font-medium text-stone-400 px-8">
                    <span>{t('quiet')}</span>
                    <span>{t('active')}</span>
                  </div>
                </div>
              </div>

              {/* Emotion Tags */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2 mb-1">
                    <Tag size={14} className="text-orange-400" /> {t('labelTags')} <span className="text-[10px] text-stone-300 font-normal ml-auto">(max 3)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOTION_TAGS.map(tagDef => {
                    const tagLabel = tagDef.label[language];
                    return (
                        <button
                        key={tagDef.id}
                        onClick={() => toggleTag(tagLabel)}
                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 border ${
                            selectedTags.includes(tagLabel)
                            ? 'bg-stone-700 text-white border-stone-700 shadow-md shadow-stone-200 transform scale-105'
                            : 'bg-white text-stone-600 border-stone-200 hover:border-orange-200 hover:bg-orange-50'
                        }`}
                        >
                        {tagLabel}
                        </button>
                    )
                  })}
                </div>
              </div>

              {/* Diary Input */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2 mb-1">
                   <PenLine size={14} className="text-orange-400" /> {t('labelDiary')}
                </label>
                <textarea
                  value={diaryText}
                  onChange={(e) => setDiaryText(e.target.value)}
                  placeholder={t('placeholderDiary')}
                  className="w-full bg-stone-50 border border-stone-200 text-stone-700 placeholder-stone-400 p-5 rounded-xl min-h-[120px] outline-none resize-none text-sm focus:bg-white focus:border-orange-300 focus:ring-4 focus:ring-orange-50 transition-all leading-relaxed"
                  disabled={isAnalyzing}
                />
              </div>
              
              <div className="pt-4 flex items-center gap-3">
                 <button
                   onClick={handleReset}
                   disabled={isAnalyzing}
                   className="px-6 py-4 rounded-xl font-bold text-sm text-stone-500 bg-stone-100 hover:bg-stone-200 hover:text-stone-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                   title="Reset"
                 >
                   <RotateCcw size={16} />
                 </button>
                <button
                  onClick={handleAnalyze}
                  disabled={!songTitle.trim() || !artistName.trim() || isAnalyzing}
                  className={`
                    flex-grow flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-sm transition-all duration-300
                    ${(!songTitle.trim() || !artistName.trim() || isAnalyzing)
                      ? 'bg-stone-100 text-stone-300 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-orange-400 to-rose-400 text-white hover:shadow-lg hover:shadow-orange-200 hover:-translate-y-0.5'}
                  `}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>{t('analyzing')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} className="text-white" />
                      <span>{t('btnSave')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Progress Indicator */}
          {isAnalyzing && (
             <div className="mt-8 text-center animate-fade-in">
               <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-md shadow-stone-100 border border-stone-100 text-stone-600 text-xs font-medium">
                 <Loader2 className="animate-spin w-4 h-4 text-orange-400" />
                 <span>{loadingStep}</span>
               </div>
             </div>
          )}
        </section>

        {/* View Toggle */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 pb-6 gap-4 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg border border-stone-100 shadow-sm">
                <History className="text-stone-400" size={18} />
            </div>
            <h3 className="text-lg font-bold text-stone-700">
              {t('timeline')}
            </h3>
          </div>
          <div className="flex bg-stone-200/50 p-1.5 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              <LayoutGrid size={14} />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'calendar' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              <CalendarIcon size={14} />
              <span>Calendar</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <section>
          {memories.length === 0 ? (
            <div className="text-center py-24 bg-white/50 rounded-3xl border border-dashed border-stone-200">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-stone-100">
                <Music className="text-stone-300 w-8 h-8" />
              </div>
              <p className="text-stone-600 font-medium">{t('emptyTitle')}</p>
              <p className="text-stone-400 text-xs mt-1">{t('emptyDesc')}</p>
            </div>
          ) : (
            <>
              {viewMode === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {memories.map((memory) => (
                    <div key={memory.id} className="h-full">
                      <MemoryCard memory={memory} language={language} onFeedback={handleFeedback} onDelete={deleteMemory} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between px-8 py-6 border-b border-stone-100">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-stone-50 rounded-full transition-colors text-stone-500">
                      <ChevronLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold text-stone-700 tracking-wide">
                      {currentDate.toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', { year: 'numeric', month: 'long' })}
                    </h2>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-stone-50 rounded-full transition-colors text-stone-500">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  
                  {/* Calendar Grid Header */}
                  <div className="grid grid-cols-7 border-b border-stone-100 bg-stone-50/50">
                    {(language === 'ja' 
                        ? ['日', '月', '火', '水', '木', '金', '土'] 
                        : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
                     ).map((day, i) => (
                      <div key={day} className={`py-4 text-center text-[10px] font-bold tracking-widest ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-sky-400' : 'text-stone-400'}`}>
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid Body */}
                  <div className="grid grid-cols-7 bg-stone-100 gap-px border-b border-stone-100">
                    {renderCalendar()}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

      </main>
    </div>
  );
};

export default App;
