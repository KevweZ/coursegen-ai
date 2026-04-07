import React from 'react';
import { GameTemplatePayload } from '../../../types/game';
import { MillionaireGame } from '../templates/MillionaireGame';
import { JeopardyGame } from '../templates/JeopardyGame';
import { FamilyFeudGame } from '../templates/FamilyFeudGame';
import { EscapeRoomGame } from '../templates/EscapeRoomGame';
import { SpinWheelGame } from '../templates/SpinWheelGame';
import { PriceIsRightGame } from '../templates/PriceIsRightGame';
import { AlertCircle } from 'lucide-react';

interface GameContainerProps {
  payload: GameTemplatePayload;
}

export function GameContainer({ payload }: GameContainerProps) {
  const renderTemplate = () => {
    switch (payload.templateType) {
      case 'millionaire':
        return <MillionaireGame payload={payload} />;
      case 'jeopardy':
        return <JeopardyGame payload={payload} />;
      case 'family-feud':
        return <FamilyFeudGame payload={payload} />;
      case 'escape-room':
        return <EscapeRoomGame payload={payload} />;
      case 'spin-wheel':
        return <SpinWheelGame payload={payload} />;
      case 'price-is-right':
        return <PriceIsRightGame payload={payload} />;
      default:
        return (
          <div className="flex items-center gap-3 p-6 text-red-400 bg-red-900/20 rounded-xl border border-red-500/30">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-bold">Unknown game template type. Please try regenerating.</span>
          </div>
        );
    }
  };

  const templateLabels: Record<string, string> = {
    'jeopardy': 'Knowledge Board',
    'millionaire': 'Millionaire Challenge',
    'family-feud': 'Ranked Survey',
    'escape-room': 'Digital Escape Room',
    'spin-wheel': 'Spin the Wheel',
    'price-is-right': 'Price Estimator',
  };

  return (
    <div className="w-full relative min-h-[500px] flex flex-col bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
      {/* Header */}
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{payload.title}</h2>
          <p className="text-sm text-gray-400">{payload.instructions}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded uppercase tracking-wider">
            Game Mode
          </div>
          <div className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">
            {templateLabels[payload.templateType] || payload.templateType}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 relative z-10 overflow-y-auto">
        {renderTemplate()}
      </div>
    </div>
  );
}
