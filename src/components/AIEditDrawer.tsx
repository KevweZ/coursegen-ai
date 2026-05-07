import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { editSlideDataViaAI } from '../services/aiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  status?: 'pending' | 'done' | 'error';
}

interface Props {
  slideType: 'scenario' | 'game-template';
  slideTitle: string;
  currentData: any;
  courseContext: string;
  theme: string;
  onApply: (newData: any) => void;
  onClose: () => void;
}

export const AIEditDrawer: React.FC<Props> = ({
  slideType, slideTitle, currentData, courseContext, theme, onApply, onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'assistant',
    text: `I can make targeted changes to this ${slideType === 'scenario' ? 'Decision Simulation' : 'Game'}. Describe what you'd like to change — a specific option, consequence, question, category, or structural element.`,
    status: 'done',
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localData, setLocalData] = useState(currentData);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isLight = theme === 'light';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');

    const userMsg: Message = { id: Date.now() + '-u', role: 'user', text };
    const pendingMsg: Message = {
      id: Date.now() + '-a', role: 'assistant',
      text: 'Applying your changes…', status: 'pending',
    };

    setMessages(prev => [...prev, userMsg, pendingMsg]);
    setIsLoading(true);

    try {
      const updated = await editSlideDataViaAI(slideType, localData, text, courseContext);
      setLocalData(updated);
      setMessages(prev => prev.map(m =>
        m.id === pendingMsg.id
          ? { ...m, text: 'Done! Changes applied. You can continue editing or close to save.', status: 'done' }
          : m
      ));
      onApply(updated);
    } catch (err: any) {
      setMessages(prev => prev.map(m =>
        m.id === pendingMsg.id
          ? { ...m, text: `Something went wrong: ${err.message}. Please try again.`, status: 'error' }
          : m
      ));
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed right-0 top-0 h-full w-full max-w-md z-[800] flex flex-col shadow-2xl',
        isLight ? 'bg-white border-l border-slate-200' : 'bg-slate-900 border-l border-slate-700',
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-5 py-4 border-b shrink-0',
        isLight ? 'border-slate-200' : 'border-slate-800',
      )}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className={cn('text-sm font-black', isLight ? 'text-slate-900' : 'text-white')}>
              Edit via AI
            </p>
            <p className="text-xs text-slate-400 max-w-[220px] truncate">{slideTitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-400',
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Examples */}
      <div className={cn('px-4 pt-3 pb-2 border-b shrink-0', isLight ? 'border-slate-100' : 'border-slate-800')}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Examples</p>
        <div className="flex flex-wrap gap-1.5">
          {(slideType === 'scenario'
            ? ['Make the Phase 2 situation more urgent', 'Add a consequence that mentions the client noticing', 'Make one option more empathetic']
            : ['Change category 3 to OSHA compliance', 'Make question 2 harder', 'Update the Daily Double to question 4']
          ).map(ex => (
            <button
              key={ex}
              onClick={() => setInput(ex)}
              disabled={isLoading}
              className={cn(
                'text-[11px] px-2.5 py-1 rounded-full border transition-all',
                isLight
                  ? 'border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'
                  : 'border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-300',
              )}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-3',
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
            )}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                {msg.status === 'pending'
                  ? <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  : msg.status === 'error'
                  ? <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  : <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                }
              </div>
            )}
            <div className={cn(
              'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-sm'
                : isLight
                ? 'bg-slate-100 text-slate-700 rounded-tl-sm'
                : 'bg-slate-800 text-slate-300 rounded-tl-sm',
              msg.status === 'error' && 'bg-red-900/20 text-red-300',
            )}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={cn('px-4 py-4 border-t shrink-0', isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950')}>
        <div className={cn(
          'flex items-end gap-2 rounded-2xl border p-2',
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700',
        )}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Describe the change you want…"
            rows={2}
            className={cn(
              'flex-1 resize-none text-sm bg-transparent focus:outline-none leading-relaxed px-2 py-1',
              isLight ? 'text-slate-800 placeholder-slate-400' : 'text-white placeholder-slate-600',
            )}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={cn(
              'p-2.5 rounded-xl shrink-0 transition-all',
              input.trim() && !isLoading
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                : isLight ? 'bg-slate-200 text-slate-400' : 'bg-slate-800 text-slate-600',
            )}
          >
            {isLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-2 text-center">
          Changes are applied live. Use Ctrl+Z or Reset to undo.
        </p>
      </div>
    </motion.div>
  );
};
