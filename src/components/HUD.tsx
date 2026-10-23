/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameStats } from '../game/types';
import { Volume2, VolumeX, Pause, Shield, Zap } from 'lucide-react';

interface HUDProps {
  stats: GameStats;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({ stats, isMuted, onToggleMute, onPause }) => {
  // Speed percentage for speedometer gauge (0 - 200 mph)
  const speedPct = Math.min(100, (stats.speedMph / 185) * 100);

  // Health color
  const healthColor =
    stats.health > 60 ? 'bg-emerald-500' : stats.health > 25 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="absolute inset-0 pointer-events-none p-3 md:p-6 flex flex-col justify-between select-none">
      {/* Top Bar Header Cluster */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Speedometer & Nitro */}
        <div className="pointer-events-auto flex items-center gap-3 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-xl px-4 py-2.5 shadow-xl">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="font-display font-black text-3xl md:text-4xl tracking-tighter text-white font-mono-numbers">
                {stats.speedMph}
              </span>
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                MPH
              </span>
            </div>

            {/* Nitro bar */}
            <div className="w-24 md:w-32 mt-1">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mb-0.5">
                <span className="flex items-center gap-1 text-cyan-400">
                  <Zap className="w-2.5 h-2.5 fill-cyan-400" /> NITRO
                </span>
                <span className="font-mono-numbers">{Math.round(stats.nitro)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-75 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                  style={{ width: `${stats.nitro}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center: Score & Combo & Active Power-ups */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800/80 rounded-xl px-5 py-2 shadow-xl flex flex-col items-center">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Score
            </span>
            <span className="font-display font-black text-2xl md:text-3xl text-amber-400 tracking-tight font-mono-numbers">
              {stats.score.toLocaleString()}
            </span>
            <div className="flex items-center gap-3 text-xs text-slate-300 mt-0.5 font-mono-numbers">
              <span>{(stats.distance / 1000).toFixed(2)} km</span>
              <span>·</span>
              <span className="text-amber-300 font-medium">★ {stats.coins}</span>
            </div>
          </div>

          {/* Active Power-ups Banners */}
          <div className="flex items-center gap-2 mt-2">
            {stats.speedBoostActive && (
              <div className="flex items-center gap-1.5 bg-amber-500/90 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs shadow-lg animate-pulse">
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>BOOST {stats.speedBoostTimer.toFixed(1)}s</span>
              </div>
            )}
            {stats.shieldActive && (
              <div className="flex items-center gap-1.5 bg-cyan-500/90 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs shadow-lg animate-pulse">
                <Shield className="w-3.5 h-3.5 fill-slate-950" />
                <span>SHIELD {stats.shieldTimer.toFixed(1)}s</span>
              </div>
            )}
            {stats.combo > 1 && (
              <div className="bg-rose-500/90 text-white font-black px-2.5 py-0.5 rounded-lg text-xs shadow-lg font-mono-numbers">
                {stats.combo}X COMBO
              </div>
            )}
          </div>
        </div>

        {/* Right: Health & Audio / Pause Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Health Box */}
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-xl px-3 py-2 shadow-xl hidden sm:flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Armor</span>
              <span className="text-white font-mono-numbers">{stats.health}%</span>
            </div>
            <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full ${healthColor} transition-all duration-150`}
                style={{ width: `${stats.health}%` }}
              />
            </div>
          </div>

          {/* Mute button */}
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute game' : 'Mute game'}
            className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors shadow-lg cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>

          {/* Pause button */}
          <button
            onClick={onPause}
            aria-label="Pause game"
            className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors shadow-lg cursor-pointer"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom info banner (optional controls reminder) */}
      <div className="hidden md:flex justify-between items-end text-xs text-slate-400 pointer-events-none pb-2">
        <div className="bg-slate-950/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800/60">
          <span>Best: <strong className="text-white font-mono-numbers">{stats.highScore.toLocaleString()}</strong> pts</span>
          <span className="mx-2">·</span>
          <span>Close Calls: <strong className="text-rose-400 font-mono-numbers">{stats.closeCalls}</strong></span>
        </div>
        <div className="bg-slate-950/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800/60 text-slate-300">
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[11px] font-mono mr-1">A / D</kbd> Steer ·{' '}
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[11px] font-mono mr-1">W / Space</kbd> Nitro ·{' '}
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[11px] font-mono mr-1">S</kbd> Brake
        </div>
      </div>
    </div>
  );
};
