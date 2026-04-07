import React, { useState, useRef, useEffect } from 'react';
import { SpinWheelPayload, SpinWheelSegment } from '../../../types/game';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Props { payload: SpinWheelPayload; }

const SEGMENT_COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#06b6d4'];

export function SpinWheelGame({ payload }: Props) {
  const { gamePayload } = payload;
  const segments: SpinWheelSegment[] = gamePayload.segments || [];
  const spinsAllowed = gamePayload.spinsAllowed || 6;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinsUsed, setSpinsUsed] = useState(0);
  const [landedSegment, setLandedSegment] = useState<SpinWheelSegment | null>(null);
  const [currentQ, setCurrentQ] = useState<{ prompt: string; correctAnswer: string; options: string[] } | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [rotationDeg, setRotationDeg] = useState(0);

  // Segment angle
  const segAngle = 360 / segments.length;

  // Draw wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || segments.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const cx = W / 2;
    const r = cx - 6;

    ctx.clearRect(0, 0, W, W);
    ctx.save();
    ctx.translate(cx, cx);
    ctx.rotate((rotationDeg * Math.PI) / 180);

    segments.forEach((seg, i) => {
      const startAngle = (i * segAngle - 90) * (Math.PI / 180);
      const endAngle = ((i + 1) * segAngle - 90) * (Math.PI / 180);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color || SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.rotate((startAngle + endAngle) / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 12px sans-serif`;
      ctx.fillText(seg.label.substring(0, 14), r - 10, 4);
      ctx.restore();
    });

    ctx.restore();

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cx, 12, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [rotationDeg, segments]);

  function spin() {
    if (isSpinning || spinsUsed >= spinsAllowed || segments.length === 0) return;
    setIsSpinning(true);
    setLandedSegment(null);
    setCurrentQ(null);
    setSelectedOption(null);
    setSubmitted(false);

    // Pick a random target segment
    const targetIndex = Math.floor(Math.random() * segments.length);
    // Extra spins + land at target
    const extraSpins = 4 + Math.floor(Math.random() * 4); // 4-7 full spins
    const targetAngle = 360 - (targetIndex * segAngle + segAngle / 2);
    const totalRotation = 360 * extraSpins + targetAngle;

    let start: number | null = null;
    const duration = 3500;
    const startRot = rotationDeg;

    function animate(ts: number) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setRotationDeg(startRot + totalRotation * eased);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        setRotationDeg(startRot + totalRotation);
        setIsSpinning(false);
        setSpinsUsed(prev => prev + 1);

        const seg = segments[targetIndex];
        setLandedSegment(seg);

        // Pick a random question from the pool
        if (seg.questionPool && seg.questionPool.length > 0) {
          const q = seg.questionPool[Math.floor(Math.random() * seg.questionPool.length)];
          const opts = q.options && q.options.length >= 2 ? q.options : [q.correctAnswer, 'Other option'];
          setCurrentQ({ ...q, options: opts.sort(() => Math.random() - 0.5) });
        }
      }
    }
    requestAnimationFrame(animate);
  }

  function handleAnswer() {
    if (!selectedOption || !currentQ) return;
    const isCorrect = selectedOption === currentQ.correctAnswer;
    if (isCorrect) setScore(prev => prev + 100);
    setSubmitted(true);
  }

  const done = spinsUsed >= spinsAllowed;

  return (
    <div className="space-y-6">
      {/* Score + spins */}
      <div className="flex justify-between items-center">
        <div className="text-center">
          <div className="text-3xl font-black text-indigo-400">{score}</div>
          <div className="text-xs text-slate-500 font-bold">POINTS</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-black text-slate-300">{spinsAllowed - spinsUsed}</div>
          <div className="text-xs text-slate-500 font-bold">SPINS LEFT</div>
        </div>
      </div>

      {/* Wheel */}
      <div className="relative flex items-center justify-center">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 text-indigo-400 text-2xl">▼</div>
        <canvas ref={canvasRef} width={280} height={280} className="rounded-full shadow-2xl" />
      </div>

      {/* Spin button */}
      {!done && !landedSegment && (
        <button
          onClick={spin}
          disabled={isSpinning}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-lg rounded-xl transition-colors"
        >
          {isSpinning ? '🌀 Spinning...' : '🎯 SPIN!'}
        </button>
      )}

      {/* Question */}
      {currentQ && landedSegment && !done && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <div className="text-xs font-bold text-indigo-400 tracking-widest uppercase">📌 {landedSegment.label}</div>
          <p className="text-white font-bold text-lg">{currentQ.prompt}</p>
          <div className="space-y-2">
            {currentQ.options.map(opt => (
              <button
                key={opt}
                disabled={submitted}
                onClick={() => setSelectedOption(opt)}
                className={`w-full text-left p-3 rounded-lg border font-medium text-sm transition-all ${
                  submitted
                    ? opt === currentQ.correctAnswer ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                      : opt === selectedOption ? 'border-red-500 bg-red-500/20 text-red-300'
                      : 'border-slate-700 text-slate-500'
                    : selectedOption === opt
                      ? 'border-indigo-500 bg-indigo-500/20 text-white'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {!submitted ? (
            <button onClick={handleAnswer} disabled={!selectedOption} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-lg transition-colors">
              Submit Answer
            </button>
          ) : (
            <div className={`p-3 rounded-lg font-bold text-sm flex items-center gap-2 ${selectedOption === currentQ.correctAnswer ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
              {selectedOption === currentQ.correctAnswer ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {selectedOption === currentQ.correctAnswer ? 'Correct! +100 pts' : `Incorrect. Answer: ${currentQ.correctAnswer}`}
            </div>
          )}
          {submitted && spinsUsed < spinsAllowed && (
            <button onClick={() => { setLandedSegment(null); setCurrentQ(null); setSelectedOption(null); setSubmitted(false); }} className="w-full py-2 text-indigo-400 hover:text-indigo-300 font-bold text-sm">
              Spin Again →
            </button>
          )}
        </div>
      )}

      {done && <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center space-y-2"><div className="text-3xl">🏁</div><div className="text-2xl font-black text-white">Final Score: {score}</div><div className="text-slate-400">All {spinsAllowed} spins used!</div></div>}
    </div>
  );
}
