import React from 'react';
import { Brain, ChevronDown, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import type { ScenarioConfig } from '../types/scenario';
import {
  SCENARIO_COMPETENCIES, SCENARIO_DOMAINS, DEFAULT_SCENARIO_CONFIG,
} from '../types/scenario';

interface Props {
  config: ScenarioConfig;
  onChange: (updated: ScenarioConfig) => void;
}

export const ScenarioBuilderPanel: React.FC<Props> = ({ config, onChange }) => {
  const set = <K extends keyof ScenarioConfig>(key: K, val: ScenarioConfig[K]) =>
    onChange({ ...config, [key]: val });

  const toggleCompetency = (c: typeof SCENARIO_COMPETENCIES[number]) => {
    const next = config.competencies.includes(c)
      ? config.competencies.filter(x => x !== c)
      : [...config.competencies, c];
    set('competencies', next);
  };

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-indigo-500/30 p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Decision Simulation Setup</h3>
          <p className="text-slate-400 text-sm">
            Configure the scenario so the AI can generate a high-fidelity workplace simulation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Learner Role */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-indigo-400">
            Learner Role <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder='e.g. "Senior Project Manager, Northbridge Solutions"'
            value={config.role}
            onChange={e => set('role', e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 placeholder-slate-600 transition-colors"
          />
          <p className="text-xs text-slate-500">Who the learner plays as. Include title and company for realism.</p>
        </div>

        {/* Scenario Context */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-indigo-400">
            Scenario Context / Tension <span className="text-red-400">*</span>
          </label>
          <textarea
            rows={3}
            placeholder='e.g. "A major client deliverable is 2 weeks away, one team member is consistently missing deadlines, and your director has just scheduled an emergency check-in."'
            value={config.context}
            onChange={e => set('context', e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 placeholder-slate-600 transition-colors resize-none"
          />
          <p className="text-xs text-slate-500">The workplace situation and tension the learner must navigate.</p>
        </div>

        {/* Industry / Domain */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-indigo-400">Industry / Domain</label>
          <div className="relative">
            <select
              value={config.domain}
              onChange={e => set('domain', e.target.value as ScenarioConfig['domain'])}
              className="w-full appearance-none bg-slate-950 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
            >
              {SCENARIO_DOMAINS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-indigo-400">Difficulty</label>
          <div className="flex gap-2">
            {(['Beginner', 'Intermediate', 'Advanced'] as const).map(d => (
              <button
                key={d}
                onClick={() => set('difficulty', d)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all',
                  config.difficulty === d
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600',
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Phase Count */}
        <div className="md:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-widest text-indigo-400">
              Decision Phases
            </label>
            <span className="text-xs font-bold text-white bg-indigo-600 px-2.5 py-0.5 rounded-full">
              {config.phaseCount}
            </span>
          </div>
          <input
            type="range"
            min={3}
            max={6}
            step={1}
            value={config.phaseCount}
            onChange={e => set('phaseCount', parseInt(e.target.value))}
            className="w-full h-2 rounded-full accent-indigo-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>3 (Quick)</span>
            <span>4 (Standard)</span>
            <span>5 (Deep)</span>
            <span>6 (Complex)</span>
          </div>
        </div>
      </div>

      {/* Competency Focus */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <label className="text-xs font-black uppercase tracking-widest text-indigo-400">
            Competency Focus
          </label>
          <span className="text-[10px] text-slate-500 ml-1">(select 2–4 to weight)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SCENARIO_COMPETENCIES.map(c => {
            const selected = config.competencies.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCompetency(c)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                  selected
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300',
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
        {config.competencies.length === 0 && (
          <p className="text-xs text-amber-400/80">Select at least one competency — this guides the AI's scoring and coaching feedback.</p>
        )}
      </div>

      {/* Reset link */}
      <button
        onClick={() => onChange({ ...DEFAULT_SCENARIO_CONFIG })}
        className="text-xs text-slate-600 hover:text-slate-400 transition-colors underline underline-offset-2"
      >
        Reset to defaults
      </button>
    </div>
  );
};
