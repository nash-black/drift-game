/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameMode, GameStats } from '../game/types';
import { RotateCcw, Home, Mail, Trophy, Zap, AlertTriangle, Share2 } from 'lucide-react';

interface GameOverModalProps {
  stats: GameStats;
  onRestart: () => void;
  onHome: () => void;
  onOpenGmailShare: () => void;
  mode: GameMode;
  dailyChallengeCompleted: boolean;
  onShare: () => void;
  shareStatus: string | null;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  onRestart,
  onHome,
  onOpenGmailShare,
  mode,
  dailyChallengeCompleted,
  onShare,
  shareStatus,
}) => {
  const isNewHighScore = stats.score >= stats.highScore && stats.score > 0;
  const isTimeTrial = mode === 'time_trial';
  const completedDaily = mode === 'daily_challenge' && stats.challengeProgress >= 8;

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
        {/* Wreck Icon / Header */}
        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-3 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h2 className="font-display font-black text-2xl md:text-3xl text-white tracking-wider uppercase mb-1">
          {isTimeTrial ? 'TIME COMPLETE' : completedDaily ? 'DAILY CLEARED' : 'WRECKED'}
        </h2>

        {completedDaily ? (
          <div className="mb-4 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold tracking-wider text-emerald-300">
            {dailyChallengeCompleted ? 'DAILY OBJECTIVE COMPLETE · BONUS AWARDED ONCE PER DAY' : 'CHALLENGE COMPLETE'}
          </div>
        ) : isNewHighScore ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wider mb-4 animate-bounce">
            <Trophy className="w-3.5 h-3.5" />
            <span>NEW ALL-TIME RECORD!</span>
          </div>
        ) : (
          <p className="text-xs text-slate-400 mb-4">
            {isTimeTrial ? 'Sprint complete. Your best time-trial score is saved on this device.' : 'Total chassis damage sustained.'}
          </p>
        )}

        {/* Final Score Hero */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 w-full mb-5">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
            Final Score
          </div>
          <div className="font-display font-black text-4xl md:text-5xl text-amber-400 tracking-tight font-mono-numbers">
            {stats.score.toLocaleString()}
          </div>
        </div>

        {/* Metric Grid */}
        <div className="grid grid-cols-2 gap-2.5 w-full mb-6 text-left">
          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Distance</div>
            <div className="font-display font-bold text-lg text-white font-mono-numbers">
              {(stats.distance / 1000).toFixed(2)} <span className="text-xs text-slate-400">km</span>
            </div>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Top Speed</div>
            <div className="font-display font-bold text-lg text-white font-mono-numbers">
              {stats.topSpeedMph} <span className="text-xs text-slate-400">MPH</span>
            </div>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Near Misses</div>
            <div className="font-display font-bold text-lg text-rose-400 font-mono-numbers">
              {stats.closeCalls}
            </div>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Coins Collected</div>
            <div className="font-display font-bold text-lg text-amber-300 font-mono-numbers">
              ★ {stats.coins}
            </div>
          </div>
          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Drift Score</div>
            <div className="font-display font-bold text-lg text-cyan-300 font-mono-numbers">
              {stats.driftScore.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Best Drift</div>
            <div className="font-display font-bold text-lg text-cyan-300 font-mono-numbers">
              {stats.bestDriftChain.toFixed(1)} <span className="text-xs text-slate-400">sec</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button type="button" onClick={onShare} className="flex items-center justify-center gap-2 rounded-xl border border-cyan-700 bg-cyan-950/70 px-4 py-3 text-xs font-bold text-cyan-100 transition-colors hover:bg-cyan-900">
            <Share2 className="h-4 w-4" />
            <span>SHARE SCORECARD</span>
          </button>
          {shareStatus && <p role="status" className="text-xs text-cyan-200">{shareStatus}</p>}

          {/* Play Again */}
          <button
            type="button"
            onClick={onRestart}
            className="group flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-display font-black text-base tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(244,63,94,0.4)] cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-5 h-5 fill-slate-950 transition-transform group-hover:-rotate-45" />
            <span>PLAY AGAIN</span>
            <span className="text-xs font-sans font-bold bg-slate-950/20 px-2 py-0.5 rounded ml-1">
              SPACE
            </span>
          </button>

          {/* Share via Gmail */}
          <button
            type="button"
            onClick={onOpenGmailShare}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all border border-slate-700 cursor-pointer active:scale-95 shadow-md"
          >
            <Mail className="w-4 h-4 text-rose-400" />
            <span>Share Telemetry via Gmail</span>
          </button>

          {/* Home */}
          <button
            type="button"
            onClick={onHome}
            className="flex items-center justify-center gap-1.5 py-2 px-4 text-slate-400 hover:text-white text-xs font-medium cursor-pointer transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Title Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
