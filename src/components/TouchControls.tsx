/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, ArrowRight, Zap, OctagonX } from 'lucide-react';
import { InputState } from '../game/types';

interface TouchControlsProps {
  onInput: (control: keyof InputState, active: boolean) => void;
  touchSteering?: boolean;
  controlScale?: number;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onInput,
  touchSteering = false,
  controlScale = 1,
}) => {
  const controlStyle = { transform: `scale(${controlScale})`, touchAction: 'none' as const };
  return (
    <div className="absolute bottom-4 inset-x-4 flex justify-between items-end pointer-events-none md:hidden z-20">
      {/* Steering Cluster */}
      {!touchSteering && <div className="flex items-center gap-3 pointer-events-auto">
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            onInput('left', true);
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            onInput('left', false);
          }}
          onPointerCancel={() => onInput('left', false)}
          aria-label="Steer Left"
          style={controlStyle}
          className="w-16 h-16 rounded-2xl bg-slate-900/80 active:bg-slate-700/90 border border-slate-700/80 text-white flex items-center justify-center shadow-2xl backdrop-blur-md active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-8 h-8" />
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            onInput('right', true);
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            onInput('right', false);
          }}
          onPointerCancel={() => onInput('right', false)}
          aria-label="Steer Right"
          style={controlStyle}
          className="w-16 h-16 rounded-2xl bg-slate-900/80 active:bg-slate-700/90 border border-slate-700/80 text-white flex items-center justify-center shadow-2xl backdrop-blur-md active:scale-95 transition-transform"
        >
          <ArrowRight className="w-8 h-8" />
        </button>
      </div>}

      {/* Throttle & Action Cluster */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            onInput('brake', true);
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            onInput('brake', false);
          }}
          onPointerCancel={() => onInput('brake', false)}
          aria-label="Brake and drift"
          style={controlStyle}
          className="w-14 h-14 rounded-2xl bg-rose-950/80 active:bg-rose-900/90 border border-rose-800 text-rose-300 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md active:scale-95 transition-transform"
        >
          <OctagonX className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">DRIFT</span>
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            onInput('nitro', true);
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            onInput('nitro', false);
          }}
          onPointerCancel={() => onInput('nitro', false)}
          aria-label="Nitro Boost"
          style={controlStyle}
          className="w-16 h-16 rounded-2xl bg-cyan-600/90 active:bg-cyan-500 border border-cyan-400 text-white flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.6)]"
        >
          <Zap className="w-7 h-7 fill-white" />
          <span className="text-[10px] font-black tracking-wider">NITRO</span>
        </button>
      </div>
    </div>
  );
};
