import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Play, X } from 'lucide-react';

interface TutorialModalProps {
  onClose: (remember: boolean) => void;
  onPractice: () => void;
}

const lessons = [
  {
    title: 'STEER THROUGH TRAFFIC',
    detail: 'Use A / D or the arrow keys to weave between cars. On mobile, hold the steering buttons or tap either side of the road.',
    badge: 'A / D  ·  ← / →',
  },
  {
    title: 'DRIFT FOR BIG POINTS',
    detail: 'Hold S or Shift while steering to slide. Keep the car moving sideways to build your drift chain and stack score.',
    badge: 'S / SHIFT + STEER',
  },
  {
    title: 'SAVE NITRO FOR A CLEAR RUN',
    detail: 'Hold Space or tap Nitro to boost. Collect coins, nitro, repairs, shields and speed boosts along the highway.',
    badge: 'SPACE  ·  PICKUPS',
  },
  {
    title: 'TAKE THE ROAD LESS TRAVELED',
    detail: 'Follow the road in the 3D chase view. Near a junction, press A / Left or D / Right to lock in a branch. If you do not choose a turn, the road continues straight.',
    badge: 'A / ← LEFT  ·  D / → RIGHT',
  },
  {
    title: 'PICK YOUR CHALLENGE',
    detail: 'Endless tests your survival. Time Trial is a 90-second sprint. Daily Challenge asks you to collect 8 coins. Press P or Escape to pause.',
    badge: 'P  /  ESC TO PAUSE',
  },
];

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose, onPractice }) => {
  const [step, setStep] = useState(0);
  const lesson = lessons[step];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <section className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl">
        <div className="mb-5 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
          <span>Rookie guide · {step + 1} / {lessons.length}</span>
          <button type="button" onClick={() => onClose(true)} aria-label="Close tutorial" className="rounded-lg p-1 hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-4 flex justify-center gap-1.5" aria-hidden="true">
          {lessons.map((item, index) => <span key={item.title} className={`h-1.5 w-8 rounded-full ${index === step ? 'bg-cyan-300' : 'bg-slate-700'}`} />)}
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">Turbo Horizon</p>
        <h2 id="tutorial-title" className="mt-2 font-display text-2xl font-black text-white">{lesson.title}</h2>
        <p className="mx-auto mt-3 min-h-16 max-w-sm text-sm leading-relaxed text-slate-300">{lesson.detail}</p>
        <div className="mt-4 rounded-xl border border-cyan-400/30 bg-cyan-950/60 p-3 font-mono text-sm font-bold tracking-wider text-cyan-200">{lesson.badge}</div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => step === 0 ? onClose(true) : setStep(step - 1)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-bold text-slate-200 hover:bg-slate-700">
            <ArrowLeft className="h-4 w-4" /> {step === 0 ? 'SKIP' : 'BACK'}
          </button>
          {step < lessons.length - 1 ? (
            <button type="button" onClick={() => setStep(step + 1)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300">
              NEXT <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={onPractice} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-rose-400 py-3 text-sm font-black text-slate-950">
              <Play className="h-4 w-4 fill-current" /> START PRACTICE
            </button>
          )}
        </div>
        <button type="button" onClick={() => onClose(true)} className="mt-4 text-xs text-slate-500 underline decoration-slate-600 underline-offset-4 hover:text-slate-300">Got it, keep browsing</button>
      </section>
    </div>
  );
};
