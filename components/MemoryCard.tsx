import React, { useState } from 'react';
import { Memory } from '../types';
import { Play, Music, Calendar, Check, X, Sparkles, Share2, MessageCircleHeart, Trash2 } from 'lucide-react';

interface MemoryCardProps {
  memory: Memory;
  onFeedback: (id: string, isCorrect: boolean) => void;
  onDelete: (id: string) => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onFeedback, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const formattedDate = new Date(memory.timestamp).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${memory.song.artist} ${memory.song.title}`)}`;

  // Calculate mood percentage
  const moodPercent = memory.moodScore + 50; 
  
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `MusicDiary: ${formattedDate}\n🎵 ${memory.song.title} / ${memory.song.artist}\n💌 ${memory.analysis.inferredEmotion}\n\n"${memory.analysis.analysisText.slice(0, 60)}..."`;
    navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('この記録を削除してもよろしいですか？')) {
      onDelete(memory.id);
    }
  };

  return (
    <div 
      className="bg-white border border-stone-100 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-orange-100/50 transition-all duration-300 group flex flex-col h-full hover:-translate-y-1 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Delete Button (Visible on hover) */}
      <button 
        onClick={handleDelete}
        className="absolute top-3 right-3 z-20 p-2 bg-white/80 backdrop-blur rounded-full text-stone-400 hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100 shadow-sm"
        title="削除する"
      >
        <Trash2 size={14} />
      </button>

      {/* Image Section */}
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        {memory.imageUrl ? (
          <img 
            src={memory.imageUrl} 
            alt={`Mood art for ${memory.song.title}`} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-stone-100">
            <Music className="w-12 h-12 text-stone-300" />
          </div>
        )}
        
        {/* Play Button */}
        <a 
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 right-4 z-10 w-12 h-12 rounded-full bg-white/95 backdrop-blur shadow-md flex items-center justify-center text-stone-800 hover:bg-stone-800 hover:text-white transition-all opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 duration-300"
          aria-label="YouTubeで聴く"
        >
          <Play size={18} fill="currentColor" className="ml-0.5" />
        </a>
        
        {/* Mood Analysis Overlay */}
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm">
                {memory.analysis.inferredEmotion}
            </span>
        </div>
      </div>

      {/* Mood Bar */}
      <div className="h-1.5 bg-stone-100 w-full relative">
        <div 
            className="absolute top-0 bottom-0 h-full transition-all duration-500 rounded-r-full"
            style={{ 
                left: 0, 
                width: `${moodPercent}%`,
                backgroundColor: memory.analysis.moodColor || '#d6d3d1'
            }}
        />
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-grow">
        
        {/* Header Info */}
        <div className="flex items-center justify-between text-xs text-stone-400 mb-3 font-medium">
          <div className="flex items-center space-x-1">
            <Calendar size={12} />
            <span>{formattedDate}</span>
          </div>
          <button 
             onClick={handleShare}
             className="flex items-center gap-1 hover:text-orange-500 transition-colors"
             title="テキストをコピー"
          >
             {copied ? <Check size={12} className="text-green-500"/> : <Share2 size={12} />}
             <span>{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>

        {/* User's Song */}
        <div className="mb-4">
            <h3 className="text-stone-800 font-bold text-lg truncate leading-tight group-hover:text-orange-800 transition-colors">{memory.song.title}</h3>
            <p className="text-stone-500 text-sm truncate mt-1">{memory.song.artist}</p>
        </div>

        {/* User's Diary & Tags */}
        <div className="mb-6 space-y-3 flex-grow">
            {memory.content && (
                <p className="text-stone-600 text-xs leading-5 whitespace-pre-wrap font-normal border-l-2 border-stone-200 pl-3">
                   {memory.content}
                </p>
            )}
            
            {memory.moodTags && memory.moodTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {memory.moodTags.map(tag => (
                        <span key={tag} className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium bg-stone-100 text-stone-600">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
        </div>

        {/* AI Analysis Section */}
        <div className="pt-4 border-t border-stone-100">
          <div className="flex items-center gap-1.5 mb-2">
             <MessageCircleHeart size={12} className="text-orange-400" />
             <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Message for You</span>
          </div>
          
          <p className="text-xs text-stone-600 leading-relaxed mb-4">
             {memory.analysis.analysisText}
          </p>

          {/* Feedback UI */}
          <div className="flex items-center justify-between mt-auto bg-stone-50 rounded-lg p-2">
              <span className="text-[10px] text-stone-400 font-medium pl-1">気持ちに合っていましたか？</span>
              <div className="flex gap-1">
                  <button 
                    onClick={() => onFeedback(memory.id, true)}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${memory.userFeedback === 'correct' ? 'bg-white shadow-sm text-teal-600' : 'text-stone-400 hover:bg-white hover:text-stone-600'}`}
                  >
                    <Check size={14} />
                  </button>
                  <button 
                    onClick={() => onFeedback(memory.id, false)}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${memory.userFeedback === 'incorrect' ? 'bg-white shadow-sm text-rose-500' : 'text-stone-400 hover:bg-white hover:text-stone-600'}`}
                  >
                    <X size={14} />
                  </button>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryCard;