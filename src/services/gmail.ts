/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { GameStats } from '../game/types';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

export const GMAIL_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
];

const provider = new GoogleAuthProvider();
for (const scope of GMAIL_SCOPES) {
  provider.addScope(scope);
}

// In-memory token caching per security rules
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// Helper: base64url encoding for RFC 2822 email payload
function base64UrlEncode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export interface SendRaceEmailParams {
  to: string;
  stats: GameStats;
  personalNote?: string;
  driverName?: string;
}

export const sendRaceResultsEmail = async ({
  to,
  stats,
  personalNote,
  driverName = 'Racer',
}: SendRaceEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated. Please sign in with Google first.');
  }

  const subject = `🏁 Turbo Horizon: Race Telemetry (${stats.score.toLocaleString()} Pts)`;
  const bodyText = `
Hi there!

${driverName} just completed a high-speed run on Turbo Horizon Highway!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏁 RACE STATS SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Score: ${stats.score.toLocaleString()} pts
• Distance Traveled: ${(stats.distance / 1000).toFixed(2)} km (${stats.distance.toLocaleString()} m)
• Top Speed: ${stats.topSpeedMph} MPH
• Close Calls (Near Misses): ${stats.closeCalls}
• Gold Coins Collected: ${stats.coins}
• High Score Record: ${Math.max(stats.score, stats.highScore).toLocaleString()} pts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${personalNote ? `Note from driver:\n"${personalNote}"\n\n` : ''}
Sent directly from Turbo Horizon 2D Highway Racer via the official Gmail API.
`;

  const rawEmail = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    bodyText,
  ].join('\r\n');

  const encodedMessage = base64UrlEncode(rawEmail);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to send email (${response.status})`);
  }

  const result = await response.json();
  return { success: true, messageId: result.id };
};
