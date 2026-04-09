import React, { useState } from 'react';
import { EscapeRoomPayload } from '../../../types/game';
import { Lock, Unlock, XCircle, ChevronRight, Scroll, X, FileText, Mail, Terminal, Search } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface Props { payload: EscapeRoomPayload; }

// Evidence panel content tied to clue keywords
function buildEvidenceContent(clue: string, stageTitle: string, correctAnswer: string): { icon: any; title: string; body: string } {
  const cl = clue.toLowerCase();
  if (cl.includes('email') || cl.includes('log')) {
    return {
      icon: Mail,
      title: '📧 Email Log — Security Alert System',
      body: `From: security-alert@company-internal.net
To: it-helpdesk@company.org
Date: Today, 09:04 AM
Subject: [ALERT] Suspicious Link Clicked — Workstation W7734

---
A user in Department 7734 clicked a flagged URL at 09:01 AM.
Threat classification: MEDIUM — Credential harvesting page.
Workstation ID: WS-${correctAnswer.toUpperCase()}
Department Code: ${correctAnswer.toUpperCase()}
Action Required: Isolate workstation immediately.

---
Log Reference: SEC-LOG-20240409-7734
System: Cortex XDR Endpoint Agent v8.2`
    };
  }
  if (cl.includes('server') || cl.includes('malware') || cl.includes('file')) {
    return {
      icon: Terminal,
      title: '💻 System Scan Report',
      body: `$ run malware-scan --deep --target WS-${correctAnswer.toUpperCase()}

[SCAN STARTED] 09:18:22
...
[DETECTED] File extension mutation: *.docx → *.docx.locked
[DETECTED] Registry key modification: HKLM\\Software\\CryptWall
[DETECTED] C2 beacon to: 185.220.101.xxx:443
[IDENTIFIED] Threat class: ransomware
[CONFIDENCE] 98.7%

Recommendation: Isolate immediately. Do NOT pay ransom.
Type the identified threat class to confirm isolation protocol.`
    };
  }
  if (cl.includes('network') || cl.includes('traffic')) {
    return {
      icon: Search,
      title: '🌐 Network Traffic Analysis',
      body: `Source IP: 192.168.1.47 (WS-${correctAnswer.toUpperCase()})
Destination: 185.220.101.42 (Flagged — Tor exit node)
Protocol: HTTPS (:443)
Bytes sent: 42,891 KB — unusually high
Time: 09:05 AM — 09:17 AM

Pattern: Consistent outbound data exfiltration signature.
Matched rule: DATA_EXFIL_01 — Answer: ${correctAnswer}`
    };
  }
  return {
    icon: FileText,
    title: `📋 Evidence Document — ${stageTitle}`,
    body: `Classification: CONFIDENTIAL
Stage: ${stageTitle}

The investigation points to the following key detail:

  → Answer key: "${correctAnswer}"

Use this information to progress through the lock.`
  };
}

export function EscapeRoomGame({ payload }: Props) {
  const { gamePayload } = payload;
  const stages = gamePayload.stages || [];

  const [stageIndex, setStageIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [failed, setFailed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [openClueIndex, setOpenClueIndex] = useState<number | null>(null);

  const currentStage = stages[stageIndex];
  if (!currentStage) return <div className="p-8 text-center text-slate-400">No stages configured.</div>;

  const lock = currentStage.lock;

  const [choiceOptions] = useState(() => {
    if (lock.type !== 'choice') return [];
    const correct = lock.correctAnswer as string;
    const wrongs = ['spyware', 'adware', 'phishing', 'rootkit'].filter(w => w.toLowerCase() !== correct.toLowerCase());
    return [correct, ...wrongs.slice(0, 3)].sort(() => Math.random() - 0.5);
  });

  function handleSubmit() {
    const answer = lock.type === 'choice' ? (selectedOption || '') : inputValue.trim();
    const correctAns = Array.isArray(lock.correctAnswer) ? lock.correctAnswer : [lock.correctAnswer];
    const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const isMatch = correctAns.some(ca => normalise(answer) === normalise(ca));

    setSubmitted(true);
    setIsCorrect(isMatch);

    if (isMatch) {
      setTimeout(() => {
        setOpenClueIndex(null);
        if (stageIndex < stages.length - 1) {
          setStageIndex(prev => prev + 1);
          setSubmitted(false);
          setInputValue('');
          setSelectedOption(null);
          setIsCorrect(false);
        } else {
          setCompleted(true);
        }
      }, 1800);
    } else {
      setFailed(true);
      setTimeout(() => {
        setSubmitted(false);
        setFailed(false);
        setInputValue('');
        setSelectedOption(null);
      }, 2000);
    }
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="text-6xl">🎉</div>
        <h2 className="text-3xl font-black text-white">Mission Complete!</h2>
        <p className="text-slate-400 max-w-md">{gamePayload.successOutro}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 relative">
      {/* Clue Evidence Overlay */}
      {openClueIndex !== null && (() => {
        const clue = currentStage.clues[openClueIndex];
        const evidence = buildEvidenceContent(clue, currentStage.title, lock.correctAnswer as string);
        const Icon = evidence.icon;
        return (
          <div className="absolute inset-0 z-50 bg-slate-950/97 backdrop-blur-sm rounded-xl flex flex-col border border-amber-500/40 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-400 font-black">
                <Icon className="w-5 h-5" />
                {evidence.title}
              </div>
              <button onClick={() => setOpenClueIndex(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <pre className="text-slate-300 text-xs font-mono whitespace-pre-wrap leading-relaxed bg-slate-900 border border-slate-700 rounded-xl p-4">
                {evidence.body}
              </pre>
            </div>
            <div className="p-4 border-t border-slate-700">
              <button onClick={() => setOpenClueIndex(null)} className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors text-sm">
                Close Evidence
              </button>
            </div>
          </div>
        );
      })()}

      {/* Progress bar */}
      <div className="flex gap-2 items-center">
        {stages.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={cn(
              'w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all',
              i < stageIndex ? 'bg-emerald-500 border-emerald-400 text-white' :
              i === stageIndex ? 'bg-indigo-500 border-indigo-400 text-white' :
              'border-slate-700 text-slate-600'
            )}>
              {i < stageIndex ? '✓' : i + 1}
            </div>
            {i < stages.length - 1 && (
              <div className={cn('flex-1 h-0.5 transition-colors', i < stageIndex ? 'bg-emerald-500' : 'bg-slate-700')} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Scenario intro (first stage only) */}
      {stageIndex === 0 && gamePayload.scenarioIntro && (
        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 text-indigo-300 text-sm italic">
          📖 {gamePayload.scenarioIntro}
        </div>
      )}

      {/* Stage header */}
      <div className="flex items-center gap-3">
        {submitted && isCorrect ? <Unlock className="w-6 h-6 text-emerald-400" /> : <Lock className="w-6 h-6 text-amber-400" />}
        <div>
          <h3 className="text-xl font-black text-white">{currentStage.title}</h3>
          <p className="text-slate-400 text-sm">Stage {stageIndex + 1} of {stages.length}</p>
        </div>
      </div>

      {/* Narrative */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 text-slate-300 leading-relaxed">
        {currentStage.narrativeText}
      </div>

      {/* Clickable Clues */}
      {currentStage.clues?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">🔍 Clues Discovered — Click to Investigate</p>
          {currentStage.clues.map((clue, i) => (
            <button
              key={i}
              onClick={() => setOpenClueIndex(i)}
              className="w-full flex items-center gap-3 bg-amber-900/20 hover:bg-amber-900/40 border border-amber-500/20 hover:border-amber-500/50 rounded-lg p-3 text-amber-300 text-sm text-left transition-all group"
            >
              <span className="font-black shrink-0 bg-amber-500/20 w-6 h-6 rounded-full flex items-center justify-center text-xs">#{i + 1}</span>
              <span className="flex-1">{clue}</span>
              <span className="text-amber-500/50 group-hover:text-amber-400 text-xs font-bold transition-colors shrink-0">Investigate →</span>
            </button>
          ))}
        </div>
      )}

      {/* Lock */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
        <p className="text-white font-bold">{lock.prompt}</p>

        {lock.type === 'choice' ? (
          <div className="grid grid-cols-1 gap-2">
            {choiceOptions.map(option => (
              <button
                key={option}
                disabled={submitted}
                onClick={() => setSelectedOption(option)}
                className={cn(
                  'text-left p-3 rounded-lg border font-medium text-sm transition-all',
                  submitted && option === (lock.correctAnswer as string) ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' :
                  submitted && option === selectedOption ? 'border-red-500 bg-red-500/20 text-red-300' :
                  selectedOption === option ? 'border-indigo-500 bg-indigo-500/20 text-white' :
                  'border-slate-700 text-slate-400 hover:border-slate-500'
                )}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !submitted && handleSubmit()}
            placeholder="Enter the unlock code or answer..."
            disabled={submitted}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none font-mono tracking-widest text-center text-lg"
          />
        )}

        {lock.hint && !submitted && (
          <p className="text-slate-500 text-xs italic">💡 Hint: {lock.hint}</p>
        )}

        {submitted && (
          <div className={cn(
            'p-3 rounded-lg font-bold text-sm flex items-center gap-2',
            isCorrect ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
          )}>
            {isCorrect ? <><Unlock className="w-4 h-4" /> Lock opened! Moving to next stage...</> : <><XCircle className="w-4 h-4" /> Incorrect — investigate the clues more carefully.</>}
          </div>
        )}

        {!submitted && (
          <button
            onClick={handleSubmit}
            disabled={lock.type === 'choice' ? !selectedOption : !inputValue.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ChevronRight className="w-4 h-4" /> Attempt to Unlock
          </button>
        )}
      </div>
    </div>
  );
}
