/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { RacingGameEngine } from './game/engine';
import { CAR_SKINS } from './game/renderer';
import { sound } from './game/audio';
import { CarSkin, GameMode, GameSettings, GameState, GameStats, InputState } from './game/types';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { GmailShareModal } from './components/GmailShareModal';
import { TouchControls } from './components/TouchControls';
import { SettingsModal } from './components/SettingsModal';
import { TutorialModal } from './components/TutorialModal';
import { initAuth } from './services/gmail';
import {
  DAILY_CHALLENGE_TARGET,
  getDailyChallengeDate,
  loadProgress,
  loadSettings,
  PlayerProgress,
  PROGRESS_KEY,
  SETTINGS_KEY,
  SKIN_UNLOCK_COSTS,
} from './services/progress';

const createEmptyStats = (highScore = 0): GameStats => ({
  score: 0,
  highScore,
  distance: 0,
  coins: 0,
  speedMph: 0,
  topSpeedMph: 0,
  health: 100,
  nitro: 100,
  combo: 1,
  comboTimer: 0,
  closeCalls: 0,
  driftScore: 0,
  driftChain: 0,
  bestDriftChain: 0,
  raceTime: 0,
  timeRemaining: 0,
  challengeProgress: 0,
  junctionDistance: 0,
  routeChoice: null,
  routesTaken: 0,
  speedBoostActive: false,
  speedBoostTimer: 0,
  shieldActive: false,
  shieldTimer: 0,
});

function getSavedHighScore(): number {
  const saved = Number(localStorage.getItem('turbo_horizon_high_score'));
  return Number.isFinite(saved) ? Math.max(0, saved) : 0;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<RacingGameEngine | null>(null);
  const touchSteeringPointer = useRef<number | null>(null);

  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [selectedSkin, setSelectedSkin] = useState<CarSkin>(() => {
    const savedProgress = loadProgress();
    const candidate = CAR_SKINS.find((skin) => skin.id === savedProgress.selectedSkinId);
    return candidate && savedProgress.unlockedSkins.includes(candidate.id) ? candidate : CAR_SKINS[0];
  });
  const [selectedMode, setSelectedMode] = useState<GameMode>('endless');
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => {
    const savedSettings = loadSettings();
    return savedSettings.showTutorial;
  });
  const [garageNotice, setGarageNotice] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [stats, setStats] = useState<GameStats>(() => createEmptyStats(getSavedHighScore()));

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new RacingGameEngine(canvasRef.current, {
      onStatsChange: (newStats) => setStats({ ...newStats }),
      onStateChange: setGameState,
      onRunComplete: (runStats, mode) => {
        const today = getDailyChallengeDate();
        const completedDaily =
          mode === 'daily_challenge' && runStats.challengeProgress >= DAILY_CHALLENGE_TARGET;

        setProgress((current) => {
          const challengeAlreadyCompleted =
            current.dailyChallengeDate === today && current.dailyChallengeCompleted;
          const dailyBonus = completedDaily && !challengeAlreadyCompleted ? 8 : 0;
          return {
            ...current,
            bankedCoins: current.bankedCoins + runStats.coins + dailyBonus,
            bestScores: {
              ...current.bestScores,
              [mode]: Math.max(current.bestScores[mode], runStats.score),
            },
            dailyChallengeDate: today,
            dailyChallengeCompleted: completedDaily || (current.dailyChallengeDate === today && current.dailyChallengeCompleted),
          };
        });
      },
    });

    engineRef.current = engine;
    engine.setSkin(selectedSkin);
    engine.configure(settings, selectedMode);
    engine.startLoop();

    const unsubscribeAuth = initAuth(
      (user) => setCurrentUser(user),
      () => setCurrentUser(null)
    );

    return () => {
      engine.destroy();
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    sound.setVolume(settings.masterVolume);
    engineRef.current?.configure(settings, selectedMode);
    document.documentElement.dataset.highContrast = String(settings.highContrast);
    document.documentElement.dataset.largeHud = String(settings.largeHud);
    document.documentElement.dataset.reducedMotion = String(settings.reducedMotion);
  }, [settings, selectedMode]);

  useEffect(() => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }, [progress]);

  const handleStartGame = useCallback(() => {
    setShareStatus(null);
    engineRef.current?.configure(settings, selectedMode);
    engineRef.current?.startGame();
  }, [settings, selectedMode]);

  const handleRestartGame = useCallback(() => {
    setShareStatus(null);
    engineRef.current?.configure(settings, selectedMode);
    engineRef.current?.restartGame();
  }, [settings, selectedMode]);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleReturnToTitle = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted(sound.toggleMute());
  }, []);

  const handleSettingsChange = useCallback((nextSettings: GameSettings) => {
    setSettings(nextSettings);
    sound.setVolume(nextSettings.masterVolume);
  }, []);

  const handleSelectSkin = useCallback((skin: CarSkin) => {
    const unlockCost = SKIN_UNLOCK_COSTS[skin.id] ?? 0;
    if (!progress.unlockedSkins.includes(skin.id)) {
      if (progress.bankedCoins < unlockCost) {
        setGarageNotice(`Earn ${unlockCost - progress.bankedCoins} more credits to unlock ${skin.name}.`);
        return;
      }

      const unlockedSkins = [...progress.unlockedSkins, skin.id];
      setProgress({
        ...progress,
        bankedCoins: progress.bankedCoins - unlockCost,
        unlockedSkins,
        selectedSkinId: skin.id,
      });
      setGarageNotice(`${skin.name} unlocked and ready to race!`);
    } else {
      setProgress({ ...progress, selectedSkinId: skin.id });
      setGarageNotice(null);
    }

    setSelectedSkin(skin);
    engineRef.current?.setSkin(skin);
  }, [progress]);

  const handleTouchInput = useCallback((control: keyof InputState, active: boolean) => {
    engineRef.current?.setVirtualInput(control, active);
  }, []);

  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!settings.touchSteering || event.pointerType !== 'touch' || gameState !== 'PLAYING') return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    touchSteeringPointer.current = event.pointerId;
    updateTouchSteering(event.clientX, event.currentTarget);
  };

  const updateTouchSteering = (clientX: number, canvas: HTMLCanvasElement) => {
    const midpoint = canvas.getBoundingClientRect().left + canvas.clientWidth / 2;
    engineRef.current?.setVirtualInput('left', clientX < midpoint - 24);
    engineRef.current?.setVirtualInput('right', clientX > midpoint + 24);
  };

  const handleCanvasPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (touchSteeringPointer.current !== event.pointerId || !settings.touchSteering) return;
    updateTouchSteering(event.clientX, event.currentTarget);
  };

  const handleCanvasPointerEnd = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (touchSteeringPointer.current !== event.pointerId) return;
    touchSteeringPointer.current = null;
    engineRef.current?.setVirtualInput('left', false);
    engineRef.current?.setVirtualInput('right', false);
  };

  const closeTutorial = (remember: boolean) => {
    setShowTutorial(false);
    if (remember) {
      setProgress((current) => ({ ...current, tutorialSeen: true }));
      setSettings((current) => ({ ...current, showTutorial: false }));
    }
  };

  const startPractice = () => {
    closeTutorial(true);
    handleStartGame();
  };

  const handleShare = async () => {
    const text = [
      `Turbo Horizon — ${selectedMode.replace('_', ' ').toUpperCase()}`,
      `Score: ${stats.score.toLocaleString()} points`,
      `Distance: ${(stats.distance / 1000).toFixed(2)} km`,
      `Top speed: ${stats.topSpeedMph} MPH`,
      `Drift score: ${stats.driftScore.toLocaleString()} points`,
      `Near misses: ${stats.closeCalls}`,
    ].join('\n');

    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Turbo Horizon race', text });
        setShareStatus('Scorecard shared.');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setShareStatus('Scorecard copied to clipboard.');
      } else {
        setShareStatus('Sharing is not available in this browser.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus(error instanceof Error ? `Could not share scorecard: ${error.message}` : 'Could not share scorecard.');
    }
  };

  const modeLabel =
    selectedMode === 'time_trial' ? 'TIME TRIAL' : selectedMode === 'daily_challenge' ? 'DAILY CHALLENGE' : 'ENDLESS';
  const dailyChallengeCompleted =
    progress.dailyChallengeDate === getDailyChallengeDate() && progress.dailyChallengeCompleted;

  return (
    <main
      className="relative flex h-screen w-screen select-none items-center justify-center overflow-hidden bg-slate-950 font-sans"
      data-game-ui
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="block h-full w-full object-cover"
          style={{ touchAction: settings.touchSteering ? 'none' : 'auto' }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerEnd}
          onPointerCancel={handleCanvasPointerEnd}
        />
      </div>

      {gameState === 'TITLE' && (
        <TitleScreen
          onStart={handleStartGame}
          selectedSkin={selectedSkin}
          onSelectSkin={handleSelectSkin}
          highScore={stats.highScore}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          currentUser={currentUser}
          onUserChange={setCurrentUser}
          mode={selectedMode}
          onSelectMode={setSelectedMode}
          bestScores={progress.bestScores}
          bankedCoins={progress.bankedCoins}
          unlockedSkins={progress.unlockedSkins}
          dailyChallengeCompleted={dailyChallengeCompleted}
          garageNotice={garageNotice}
          onOpenSettings={() => setShowSettings(true)}
          onOpenTutorial={() => setShowTutorial(true)}
        />
      )}

      {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
        <HUD
          stats={stats}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPause={handleTogglePause}
          largeHud={settings.largeHud}
          modeLabel={modeLabel}
        />
      )}

      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={handleTogglePause}
          onRestart={handleRestartGame}
          onHome={handleReturnToTitle}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {gameState === 'GAMEOVER' && (
        <GameOverModal
          stats={stats}
          onRestart={handleRestartGame}
          onHome={handleReturnToTitle}
          onOpenGmailShare={() => setShowGmailModal(true)}
          mode={selectedMode}
          dailyChallengeCompleted={dailyChallengeCompleted}
          onShare={handleShare}
          shareStatus={shareStatus}
        />
      )}

      {showGmailModal && (
        <GmailShareModal
          stats={stats}
          currentUser={currentUser}
          onUserChange={setCurrentUser}
          onClose={() => setShowGmailModal(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showTutorial && gameState === 'TITLE' && (
        <TutorialModal onClose={closeTutorial} onPractice={startPractice} />
      )}

      {gameState === 'PLAYING' && (
        <TouchControls
          onInput={handleTouchInput}
          touchSteering={settings.touchSteering}
          controlScale={settings.touchControlScale}
        />
      )}
    </main>
  );
}
