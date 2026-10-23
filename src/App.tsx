/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { RacingGameEngine } from './game/engine';
import { CAR_SKINS } from './game/renderer';
import { sound } from './game/audio';
import { CarSkin, GameState, GameStats, InputState } from './game/types';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { GmailShareModal } from './components/GmailShareModal';
import { TouchControls } from './components/TouchControls';
import { initAuth } from './services/gmail';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<RacingGameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [selectedSkin, setSelectedSkin] = useState<CarSkin>(CAR_SKINS[0]);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showGmailModal, setShowGmailModal] = useState<boolean>(false);

  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    distance: 0,
    coins: 0,
    speedMph: 0,
    topSpeedMph: 0,
    health: 100,
    nitro: 100,
    combo: 1,
    comboTimer: 0,
    closeCalls: 0,
    speedBoostActive: false,
    speedBoostTimer: 0,
    shieldActive: false,
    shieldTimer: 0,
  });

  // Initialize engine and auth
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new RacingGameEngine(canvasRef.current, {
      onStatsChange: (newStats) => {
        setStats({ ...newStats });
      },
      onStateChange: (newState) => {
        setGameState(newState);
      },
    });

    engineRef.current = engine;
    engine.setSkin(selectedSkin);
    engine.startLoop();

    // Check for saved high score
    const savedHigh = localStorage.getItem('turbo_horizon_high_score');
    if (savedHigh) {
      setStats((prev) => ({ ...prev, highScore: parseInt(savedHigh, 10) || 0 }));
    }

    // Initialize Firebase Google Auth listener
    const unsubscribeAuth = initAuth(
      (user) => setCurrentUser(user),
      () => setCurrentUser(null)
    );

    return () => {
      engine.destroy();
      unsubscribeAuth();
    };
  }, []);

  const handleStartGame = useCallback(() => {
    engineRef.current?.startGame();
  }, []);

  const handleRestartGame = useCallback(() => {
    engineRef.current?.restartGame();
  }, []);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleReturnToTitle = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.state = 'TITLE';
      setGameState('TITLE');
      sound.stopEngine();
      sound.stopBgm();
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  const handleSelectSkin = useCallback((skin: CarSkin) => {
    setSelectedSkin(skin);
    engineRef.current?.setSkin(skin);
  }, []);

  const handleTouchInput = useCallback((control: keyof InputState, active: boolean) => {
    engineRef.current?.setVirtualInput(control, active);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 flex items-center justify-center select-none font-sans">
      {/* 60fps Isolated Canvas Layer */}
      <div className="absolute inset-0 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="block w-full h-full object-cover"
        />
      </div>

      {/* Title Screen */}
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
        />
      )}

      {/* In-Game Heads-Up Display (HUD) */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
        <HUD
          stats={stats}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPause={handleTogglePause}
        />
      )}

      {/* Pause Modal */}
      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={handleTogglePause}
          onRestart={handleRestartGame}
          onHome={handleReturnToTitle}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Game Over Screen */}
      {gameState === 'GAMEOVER' && (
        <GameOverModal
          stats={stats}
          onRestart={handleRestartGame}
          onHome={handleReturnToTitle}
          onOpenGmailShare={() => setShowGmailModal(true)}
        />
      )}

      {/* Gmail Telemetry Email Modal */}
      {showGmailModal && (
        <GmailShareModal
          stats={stats}
          currentUser={currentUser}
          onUserChange={setCurrentUser}
          onClose={() => setShowGmailModal(false)}
        />
      )}

      {/* Touch / Mobile Controls (displayed when playing) */}
      {gameState === 'PLAYING' && <TouchControls onInput={handleTouchInput} />}
    </main>
  );
}
