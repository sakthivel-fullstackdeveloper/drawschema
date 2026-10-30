import React, { useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { AICommandModal } from './AICommandModal';

interface FloatingAIRobotProps {
  projectId?: number;
}

export const FloatingAIRobot: React.FC<FloatingAIRobotProps> = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Robot Trigger anchored at bottom-right */}
      <aside 
        aria-label="AI Assistant"
        className="fixed bottom-6 right-6 z-40 flex flex-col items-end pointer-events-auto select-none"
      >
        {/* Speech Bubble */}
        {!isOpen && (
          <div 
            className="mb-2 mr-1 px-3 py-1.5 rounded-2xl bg-indigo-950/90 text-indigo-200 border border-indigo-500/30 text-xs font-semibold shadow-xl backdrop-blur animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-center gap-1.5 cursor-pointer hover:bg-indigo-900/90 transition"
            onClick={() => setIsOpen(true)}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>I'm listening! Just talk to me...</span>
            <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-indigo-950/90 border-r border-b border-indigo-500/30 rotate-45" />
          </div>
        )}

        {/* Robot Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
          aria-expanded={isOpen}
          className={`group relative flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/40 rounded-full ${
            isOpen ? 'scale-95' : 'hover:scale-105 active:scale-95'
          }`}
        >
          {/* Subtle Outer Glow Wave */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 opacity-60 blur-md group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />

          {/* Robot Avatar Container */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-indigo-400/50 bg-slate-900/90 shadow-2xl flex items-center justify-center p-0.5 backdrop-blur">
            <img 
              src="/robot1.gif" 
              alt="DrawSchema AI Copilot Robot" 
              className="w-full h-full object-cover filter drop-shadow-md group-hover:brightness-110 transition-all duration-300 rounded-full"
              onError={(e) => {
                // Fallback to static png or icon if gif fails
                const img = e.currentTarget;
                if (!img.src.includes('robot-avatar.png')) {
                  img.src = '/robot-avatar.png';
                } else {
                  img.style.display = 'none';
                  const parent = img.parentElement;
                  if (parent) {
                    parent.classList.add('bg-indigo-600', 'text-white');
                  }
                }
              }}
            />
            {/* Fallback Icon Container if image not supported */}
            <Bot className="hidden w-10 h-10 text-white" />
          </div>

          {/* Status Indicator Dot (Green for Ready/Listening) */}
          <span 
            className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-md animate-pulse" 
            title="AI Copilot Ready"
          />
        </button>
      </aside>

      {/* Floating Anchored AI Assistant Panel */}
      <AICommandModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
};
