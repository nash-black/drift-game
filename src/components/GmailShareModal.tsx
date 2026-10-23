/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { GameStats } from '../game/types';
import { sendRaceResultsEmail, googleSignIn } from '../services/gmail';
import { Mail, CheckCircle2, AlertCircle, Loader2, X, Send } from 'lucide-react';

interface GmailShareModalProps {
  stats: GameStats;
  currentUser: User | null;
  onUserChange: (user: User | null) => void;
  onClose: () => void;
}

export const GmailShareModal: React.FC<GmailShareModalProps> = ({
  stats,
  currentUser,
  onUserChange,
  onClose,
}) => {
  const [recipient, setRecipient] = useState(currentUser?.email || '');
  const [driverName, setDriverName] = useState(currentUser?.displayName || 'Highway Pilot');
  const [personalNote, setPersonalNote] = useState('Check out my new score run on Turbo Horizon!');
  const [isSending, setIsSending] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setError(null);
      const res = await googleSignIn();
      if (res) {
        onUserChange(res.user);
        if (!recipient) {
          setRecipient(res.user.email || '');
        }
        if (res.user.displayName) {
          setDriverName(res.user.displayName);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setIsSigningIn(false);
    }
  };

  const initiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !recipient.includes('@')) {
      setError('Please provide a valid recipient email address.');
      return;
    }
    setError(null);
    setShowConfirm(true); // Open mandatory confirmation dialog
  };

  const handleConfirmedSend = async () => {
    try {
      setIsSending(true);
      setError(null);
      await sendRaceResultsEmail({
        to: recipient,
        stats,
        driverName,
        personalNote,
      });
      setSentSuccess(true);
      setShowConfirm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send email via Gmail API.');
      setShowConfirm(false);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">Share Telemetry via Gmail</h3>
              <p className="text-[11px] text-slate-400">Email official race scorecard & metrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {sentSuccess ? (
            <div className="flex flex-col items-center text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
              <h4 className="font-display font-bold text-lg text-white mb-1">Email Sent Successfully!</h4>
              <p className="text-xs text-slate-400 mb-6">
                Your race scorecard has been dispatched to <strong className="text-slate-200">{recipient}</strong> via your connected Gmail account.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : !currentUser ? (
            <div className="flex flex-col items-center text-center py-4">
              <p className="text-xs text-slate-300 mb-4">
                Connect your Google account with Gmail permissions to send race telemetry cards directly from your inbox.
              </p>
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white text-slate-800 hover:bg-slate-100 font-semibold text-xs shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span>{isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
              </button>
              {error && <p className="text-xs text-rose-400 mt-3">{error}</p>}
            </div>
          ) : (
            <form onSubmit={initiateSend} className="space-y-4">
              {/* Telemetry Preview Card */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
                <div className="font-semibold text-amber-400 mb-1 flex justify-between">
                  <span>Race Summary</span>
                  <span className="text-white font-mono font-mono-numbers">{stats.score.toLocaleString()} PTS</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 mt-2">
                  <div>
                    <span className="block text-[10px] text-slate-400">DISTANCE</span>
                    <strong className="text-slate-200 font-mono font-mono-numbers">{(stats.distance / 1000).toFixed(2)} km</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">TOP SPEED</span>
                    <strong className="text-slate-200 font-mono font-mono-numbers">{stats.topSpeedMph} MPH</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">CLOSE CALLS</span>
                    <strong className="text-rose-400 font-mono font-mono-numbers">{stats.closeCalls}</strong>
                  </div>
                </div>
              </div>

              {/* Recipient */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="racer@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              {/* Driver Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Personal Message (Optional)
                </label>
                <textarea
                  rows={2}
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500 transition-colors resize-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/60 p-2.5 rounded-xl border border-rose-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Telemetry</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Mandatory User Confirmation Dialog before mutating/sending email */}
        {showConfirm && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
              <Mail className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <h4 className="font-display font-bold text-base text-white mb-2">
                Confirm Email Dispatch
              </h4>
              <p className="text-xs text-slate-300 mb-5 leading-relaxed">
                Send official race summary from your connected Gmail address to{' '}
                <strong className="text-white">{recipient}</strong>?
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isSending}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmedSend}
                  disabled={isSending}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg transition-all cursor-pointer"
                >
                  {isSending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSending ? 'Sending...' : 'Confirm & Send'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
