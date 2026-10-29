import { GameMode, GameSettings } from '../game/types';

export const SETTINGS_KEY = 'turbo_horizon_settings';
export const PROGRESS_KEY = 'turbo_horizon_progress';
export const DAILY_CHALLENGE_TARGET = 8;
export const TIME_TRIAL_SECONDS = 90;

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.65,
  steeringSensitivity: 1,
  reducedMotion: false,
  highContrast: false,
  colorblindPickups: false,
  largeHud: false,
  touchSteering: false,
  touchControlScale: 1,
  showTutorial: true,
};

export interface PlayerProgress {
  bankedCoins: number;
  unlockedSkins: string[];
  selectedSkinId: string;
  bestScores: Record<GameMode, number>;
  tutorialSeen: boolean;
  dailyChallengeDate: string;
  dailyChallengeCompleted: boolean;
}

export const DEFAULT_PROGRESS: PlayerProgress = {
  bankedCoins: 0,
  unlockedSkins: ['crimson_fury'],
  selectedSkinId: 'crimson_fury',
  bestScores: {
    endless: 0,
    time_trial: 0,
    daily_challenge: 0,
  },
  tutorialSeen: false,
  dailyChallengeDate: '',
  dailyChallengeCompleted: false,
};

export const SKIN_UNLOCK_COSTS: Record<string, number> = {
  crimson_fury: 0,
  cyber_volt: 80,
  midnight_shadow: 160,
  hyper_gold: 260,
  emerald_apex: 400,
};

export function loadSettings(): GameSettings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;

  try {
    const saved: Partial<GameSettings> = JSON.parse(raw);
    return {
      masterVolume: clampNumber(saved.masterVolume, DEFAULT_SETTINGS.masterVolume, 0, 1),
      steeringSensitivity: clampNumber(saved.steeringSensitivity, 1, 0.6, 1.6),
      reducedMotion: saved.reducedMotion === true,
      highContrast: saved.highContrast === true,
      colorblindPickups: saved.colorblindPickups === true,
      largeHud: saved.largeHud === true,
      touchSteering: saved.touchSteering === true,
      touchControlScale: clampNumber(saved.touchControlScale, 1, 0.85, 1.35),
      showTutorial: saved.showTutorial !== false,
    };
  } catch (error) {
    console.warn('Saved game settings could not be read; using defaults.', error);
    return DEFAULT_SETTINGS;
  }
}

export function loadProgress(): PlayerProgress {
  const raw = localStorage.getItem(PROGRESS_KEY);
  if (!raw) return DEFAULT_PROGRESS;

  try {
    const saved: Partial<PlayerProgress> = JSON.parse(raw);
    const bestScores = saved.bestScores;
    const dailyChallengeDate = typeof saved.dailyChallengeDate === 'string' ? saved.dailyChallengeDate : '';
    const today = getDailyChallengeDate();
    return {
      bankedCoins: clampNumber(saved.bankedCoins, 0, 0, Number.MAX_SAFE_INTEGER),
      unlockedSkins: Array.isArray(saved.unlockedSkins)
        ? Array.from(new Set(saved.unlockedSkins.filter((id): id is string => typeof id === 'string')))
        : DEFAULT_PROGRESS.unlockedSkins,
      selectedSkinId:
        typeof saved.selectedSkinId === 'string' ? saved.selectedSkinId : DEFAULT_PROGRESS.selectedSkinId,
      bestScores: {
        endless: clampNumber(bestScores?.endless, 0, 0, Number.MAX_SAFE_INTEGER),
        time_trial: clampNumber(bestScores?.time_trial, 0, 0, Number.MAX_SAFE_INTEGER),
        daily_challenge: clampNumber(bestScores?.daily_challenge, 0, 0, Number.MAX_SAFE_INTEGER),
      },
      tutorialSeen: saved.tutorialSeen === true,
      dailyChallengeDate,
      dailyChallengeCompleted: dailyChallengeDate === today && saved.dailyChallengeCompleted === true,
    };
  } catch (error) {
    console.warn('Saved game progress could not be read; using a fresh profile.', error);
    return DEFAULT_PROGRESS;
  }
}

export function getDailyChallengeDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}
