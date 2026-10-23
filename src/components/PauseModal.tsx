/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onHome,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
        <h2 className="font-display font-black text-3xl text-white tracking-wider uppercase mb-1">
          PAUSED
        </h2>
        <p className="text-xs text-slate-400 mb-6">Race temporarily halted. Ready to hit the asphalt?</p>

        <div className="flex flex-col gap-3 w-full">
          {/* Resume */}
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-black text-sm tracking-wide transition-all shadow-lg cursor-pointer active:scale-95"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>RESUME (ESC / P)</span>
          </button>

          {/* Restart */}
          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all border border-slate-700 cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART RACE</span>
          </button>

          {/* Audio toggle */}
          <button
            onClick={onToggleMute}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs transition-colors border border-slate-800 cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span>{isMuted ? 'Unmute Audio & Music' : 'Mute Audio & Music'}</span>
          </button>

          {/* Main Menu */}
          <button
            onClick={onHome}
            className="flex items-center justify-center gap-2 py-2 px-4 text-slate-400 hover:text-slate-200 text-xs font-medium cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Title Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
