/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { CAR_SKINS } from '../game/renderer';
import { CarSkin } from '../game/types';
import { Volume2, VolumeX, Play, Shield, Zap, Mail, LogOut, Check } from 'lucide-react';
import { googleSignIn, logout } from '../services/gmail';

interface TitleScreenProps {
  onStart: () => void;
  selectedSkin: CarSkin;
  onSelectSkin: (skin: CarSkin) => void;
  highScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
  currentUser: User | null;
  onUserChange: (user: User | null) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  selectedSkin,
  onSelectSkin,
  highScore,
  isMuted,
  onToggleMute,
  currentUser,
  onUserChange,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setAuthError(null);
      const res = await googleSignIn();
      if (res) {
        onUserChange(res.user);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Google sign-in could not be completed.';
      setAuthError(errorMsg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onUserChange(null);
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-4 md:p-8 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/90 pointer-events-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        {/* Audio Mute Switch */}
        <button
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs font-semibold backdrop-blur-md"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          <span>{isMuted ? 'Audio Off' : 'Sound On'}</span>
        </button>

        {/* Gmail Auth / Account Button */}
        <div>
          {currentUser ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Pilot'}
                  className="w-6 h-6 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-cyan-600 flex items-center justify-center text-xs font-bold text-white">
                  {currentUser.displayName?.[0] || 'G'}
                </div>
              )}
              <span className="text-xs text-slate-200 font-medium max-w-[120px] truncate">
                {currentUser.displayName || currentUser.email}
              </span>
              <button
                onClick={handleSignOut}
                title="Sign out of Gmail"
                className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white text-slate-800 hover:bg-slate-100 font-medium text-xs shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {/* Google G logo SVG */}
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isSigningIn ? 'Connecting...' : 'Sign in for Gmail Sharing'}</span>
            </button>
          )}
        </div>
      </div>

      {authError && (
        <div className="mx-auto max-w-md text-xs text-rose-300 bg-rose-950/80 border border-rose-800 px-3 py-1.5 rounded-lg text-center">
          {authError}
        </div>
      )}

      {/* Hero Title Lockup */}
      <div className="flex flex-col items-center text-center my-auto">
        {/* Bespoke inline SVG Title */}
        <div className="relative mb-2">
          <svg className="w-72 sm:w-96 md:w-[480px] h-20 md:h-28" viewBox="0 0 500 110" fill="none">
            <defs>
              <linearGradient id="turboGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <linearGradient id="horizonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
            </defs>
            <text
              x="250"
              y="54"
              textAnchor="middle"
              className="font-display font-black tracking-widest text-5xl md:text-6xl"
              fill="url(#turboGrad)"
              style={{ fontStyle: 'italic', filter: 'drop-shadow(0 4px 12px rgba(239, 68, 68, 0.4))' }}
            >
              TURBO
            </text>
            <text
              x="250"
              y="98"
              textAnchor="middle"
              className="font-display font-black tracking-widest text-3xl md:text-4xl"
              fill="url(#horizonGrad)"
              style={{ letterSpacing: '0.25em', filter: 'drop-shadow(0 4px 12px rgba(56, 189, 248, 0.4))' }}
            >
              HORIZON
            </text>
          </svg>
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold mt-1">
            2D Highway Circuit Racer
          </div>
        </div>

        {/* High Score Badge */}
        {highScore > 0 && (
          <div className="mb-6 px-4 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wider flex items-center gap-2">
            <span>RECORD HIGHSCORE</span>
            <span className="font-mono font-bold text-white font-mono-numbers">{highScore.toLocaleString()}</span>
          </div>
        )}

        {/* Start Game CTA */}
        <button
          onClick={onStart}
          className="group relative inline-flex items-center gap-3 px-8 md:px-12 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 text-slate-950 font-display font-black text-lg md:text-xl tracking-wider uppercase shadow-[0_0_30px_rgba(244,63,94,0.5)] hover:shadow-[0_0_45px_rgba(244,63,94,0.8)] active:scale-95 transition-all cursor-pointer mb-6"
        >
          <Play className="w-6 h-6 fill-slate-950 transition-transform group-hover:scale-110" />
          <span>START RACE</span>
          <span className="hidden sm:inline text-xs font-sans font-bold bg-slate-950/20 px-2 py-0.5 rounded text-slate-950 ml-1">
            SPACE
          </span>
        </button>

        {/* Car Skin Selector */}
        <div className="flex flex-col items-center bg-slate-950/80 backdrop-blur-md p-3 md:p-4 rounded-2xl border border-slate-800/80 max-w-lg w-full">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2.5">
            Select Machine: <strong className="text-white">{selectedSkin.name}</strong>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {CAR_SKINS.map((skin) => {
              const isSelected = selectedSkin.id === skin.id;
              return (
                <button
                  key={skin.id}
                  onClick={() => onSelectSkin(skin)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 bg-amber-400/10 text-white shadow-md'
                      : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
                    style={{ backgroundColor: skin.primary }}
                  />
                  <span>{skin.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Power-up & Controls Guide */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-slate-800/80">
        {/* Powerups legend */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-amber-400 font-medium">
            <Zap className="w-3.5 h-3.5 fill-amber-400" />
            <span>⚡ Speed Boost (185 MPH)</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
            <Shield className="w-3.5 h-3.5 fill-cyan-400" />
            <span>🛡️ Shield (Invincible)</span>
          </div>
        </div>

        {/* Controls */}
        <div className="text-slate-300">
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[11px] mr-1">Left/Right or A/D</kbd> Steer ·{' '}
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[11px] mr-1">Space</kbd> Nitro ·{' '}
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[11px] mr-1">S</kbd> Brake
        </div>
      </div>
    </div>
  );
};
