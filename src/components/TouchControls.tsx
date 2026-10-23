/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, ArrowRight, Zap, OctagonX } from 'lucide-react';
import { InputState } from '../game/types';

interface TouchControlsProps {
  onInput: (control: keyof InputState, active: boolean) => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ onInput }) => {
  return (
    <div className="absolute bottom-4 inset-x-4 flex justify-between items-end pointer-events-none md:hidden z-20">
      {/* Steering Cluster */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            onInput('left', true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onInput('left', false);
          }}
          onMouseDown={() => onInput('left', true)}
          onMouseUp={() => onInput('left', false)}
          onMouseLeave={() => onInput('left', false)}
          aria-label="Steer Left"
          className="w-16 h-16 rounded-2xl bg-slate-900/80 active:bg-slate-700/90 border border-slate-700/80 text-white flex items-center justify-center shadow-2xl backdrop-blur-md active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-8 h-8" />
        </button>

        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            onInput('right', true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onInput('right', false);
          }}
          onMouseDown={() => onInput('right', true)}
          onMouseUp={() => onInput('right', false)}
          onMouseLeave={() => onInput('right', false)}
          aria-label="Steer Right"
          className="w-16 h-16 rounded-2xl bg-slate-900/80 active:bg-slate-700/90 border border-slate-700/80 text-white flex items-center justify-center shadow-2xl backdrop-blur-md active:scale-95 transition-transform"
        >
          <ArrowRight className="w-8 h-8" />
        </button>
      </div>

      {/* Throttle & Action Cluster */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            onInput('brake', true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onInput('brake', false);
          }}
          onMouseDown={() => onInput('brake', true)}
          onMouseUp={() => onInput('brake', false)}
          onMouseLeave={() => onInput('brake', false)}
          aria-label="Brake"
          className="w-14 h-14 rounded-2xl bg-rose-950/80 active:bg-rose-900/90 border border-rose-800 text-rose-300 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md active:scale-95 transition-transform"
        >
          <OctagonX className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">STOP</span>
        </button>

        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            onInput('nitro', true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onInput('nitro', false);
          }}
          onMouseDown={() => onInput('nitro', true)}
          onMouseUp={() => onInput('nitro', false)}
          onMouseLeave={() => onInput('nitro', false)}
          aria-label="Nitro Boost"
          className="w-16 h-16 rounded-2xl bg-cyan-600/90 active:bg-cyan-500 border border-cyan-400 text-white flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.6)]"
        >
          <Zap className="w-7 h-7 fill-white" />
          <span className="text-[10px] font-black tracking-wider">NITRO</span>
        </button>
      </div>
    </div>
  );
};
