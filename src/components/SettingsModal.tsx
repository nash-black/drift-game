import React from 'react';
import { GameSettings } from '../game/types';
import { X } from 'lucide-react';

interface SettingsModalProps {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onChange, onClose }) => {
  const update = (patch: Partial<GameSettings>) => onChange({ ...settings, ...patch });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl md:p-7">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-300">Personalize your race</p>
            <h2 id="settings-title" className="font-display text-2xl font-black text-white">SETTINGS</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close settings" className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5">
          <label className="block">
            <span className="flex justify-between text-sm font-semibold text-slate-200">
              <span>Sound volume</span><span>{Math.round(settings.masterVolume * 100)}%</span>
            </span>
            <input className="mt-2 w-full accent-cyan-400" type="range" min="0" max="1" step="0.05" value={settings.masterVolume} onChange={(event) => update({ masterVolume: Number(event.target.value) })} />
          </label>

          <label className="block">
            <span className="flex justify-between text-sm font-semibold text-slate-200">
              <span>Steering sensitivity</span><span>{settings.steeringSensitivity.toFixed(1)}×</span>
            </span>
            <input className="mt-2 w-full accent-cyan-400" type="range" min="0.6" max="1.6" step="0.1" value={settings.steeringSensitivity} onChange={(event) => update({ steeringSensitivity: Number(event.target.value) })} />
          </label>

          <label className="block">
            <span className="flex justify-between text-sm font-semibold text-slate-200">
              <span>Touch button size</span><span>{Math.round(settings.touchControlScale * 100)}%</span>
            </span>
            <input className="mt-2 w-full accent-cyan-400" type="range" min="0.85" max="1.35" step="0.05" value={settings.touchControlScale} onChange={(event) => update({ touchControlScale: Number(event.target.value) })} />
          </label>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">Accessibility</legend>
            <Toggle label="Reduce screen shake and motion" checked={settings.reducedMotion} onChange={(checked) => update({ reducedMotion: checked })} />
            <Toggle label="High-contrast interface" checked={settings.highContrast} onChange={(checked) => update({ highContrast: checked })} />
            <Toggle label="Larger HUD text" checked={settings.largeHud} onChange={(checked) => update({ largeHud: checked })} />
            <Toggle label="Show color-independent pickup labels" checked={settings.colorblindPickups} onChange={(checked) => update({ colorblindPickups: checked })} />
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">Controls</legend>
            <Toggle label="Tap left / right side of screen to steer" checked={settings.touchSteering} onChange={(checked) => update({ touchSteering: checked })} />
          </fieldset>

          <Toggle label="Show the quick-start guide on next visit" checked={settings.showTutorial} onChange={(checked) => update({ showTutorial: checked })} />
        </div>

        <p className="mt-5 text-xs leading-relaxed text-slate-500">Settings are saved on this device. No account is needed to play or keep progress.</p>
      </section>
    </div>
  );
};

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange }) => (
  <label className="flex cursor-pointer items-center justify-between gap-4 text-sm text-slate-200">
    <span>{label}</span>
    <input
      className="h-5 w-5 shrink-0 accent-cyan-400"
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
  </label>
);
