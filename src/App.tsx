import React, { useEffect, useState } from 'react';
import { GameEngine } from './game/engine';
import { GameCanvas } from './components/GameCanvas';
import { VirtualNESController } from './components/VirtualNESController';
import { InventoryCraftingModal } from './components/InventoryCraftingModal';
import { MapModal } from './components/MapModal';
import { ShopModal } from './components/ShopModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { DailyChallengeModal } from './components/DailyChallengeModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';
import { SettingsModal } from './components/SettingsModal';
import { StoryLoreModal } from './components/StoryLoreModal';
import { RetroTitleMenu } from './components/RetroTitleMenu';
import { DailyChallenge, GamePhase, GameSettings, UserProfile } from './types';
import { soundEngine } from './audio/soundEngine';

const STORAGE_KEY = '99_noches_profile_v1';
const SETTINGS_KEY = '99_noches_settings_v1';

function generateRandomSyncCode(): string {
  return 'NES-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

export default function App() {
  // Game Settings State
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      crtFilter: true,
      soundVolume: 0.8,
      musicVolume: 0.5,
      voiceVolume: 0.9,
      spanishVoice: true,
      touchControls: true,
      dpadType: 'stick',
    };
  });

  // User Profile State (Cloud & Local)
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      syncCode: generateRandomSyncCode(),
      playerName: 'Superviviente' + Math.floor(Math.random() * 900 + 100),
      highestNight: 1,
      totalKills: 0,
      gold: 50,
      unlockedSkins: ['classic'],
      unlockedPets: ['none'],
      unlockedFireStyles: ['classic_orange'],
      activeSkin: 'classic',
      activePet: 'none',
      activeFireStyle: 'classic_orange',
      skills: {},
      lastSaved: new Date().toISOString(),
      dailyStreak: 0,
      lastDailyDate: '',
    };
  });

  // Navigation / Phase
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [engine, setEngine] = useState<GameEngine | null>(null);

  // Active Modals
  const [showCrafting, setShowCrafting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showDaily, setShowDaily] = useState(false);
  const [showCloudSync, setShowCloudSync] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [showStoryLore, setShowStoryLore] = useState(false);

  // Sync settings with soundEngine
  useEffect(() => {
    soundEngine.setVolumes(
      settings.soundVolume,
      settings.musicVolume,
      settings.voiceVolume,
      settings.spanishVoice
    );
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // Persist Profile to LocalStorage and Auto-Sync Cloud
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      // Background sync to server API
      fetch('/api/cloud/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncCode: profile.syncCode, profile }),
      }).catch(() => {});
    } catch {}
  }, [profile]);

  // Start New Survival Game (Standard 99 Nights)
  const startSurvivalGame = (dailyModifier: string = 'none') => {
    const newEngine = new GameEngine(
      profile.activeSkin,
      profile.activePet,
      profile.activeFireStyle,
      dailyModifier,
      Date.now()
    );

    newEngine.setCallbacks(
      () => {
        // Game Over
        setShowGameOver(true);
        handleRecordScore(newEngine, dailyModifier !== 'none');
      },
      () => {
        // Victory 99
        setShowVictory(true);
        handleRecordScore(newEngine, dailyModifier !== 'none');
      }
    );

    setEngine(newEngine);
    setPhase('playing');
    setShowGameOver(false);
    setShowVictory(false);
    setShowCrafting(false);
    setShowMap(false);
    setShowStoryLore(false);

    soundEngine.startMusic('day');
    soundEngine.speakSpanish('¡Bienvenido al bosque de San Telmo! Sobrevive 99 noches y mantén la fogata encendida.', 'game_start');
  };

  const handleRecordScore = (activeEngine: GameEngine, isDaily: boolean) => {
    const p = activeEngine.state.player;
    const reachedNight = activeEngine.state.currentNight;

    // Update Profile
    setProfile(prev => ({
      ...prev,
      highestNight: Math.max(prev.highestNight, reachedNight),
      totalKills: prev.totalKills + p.kills,
      gold: prev.gold + Math.floor(p.score / 100),
    }));

    // Submit to Cloud Leaderboard API
    fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: profile.playerName,
        nightReached: reachedNight,
        score: p.score,
        kills: p.kills,
        timeSurvivedSeconds: Math.floor(p.timeSurvivedSeconds),
        skin: profile.activeSkin,
        isDaily,
      }),
    }).catch(() => {});
  };

  const handleStartDaily = (challenge: DailyChallenge) => {
    setShowDaily(false);
    startSurvivalGame(challenge.modifier);
  };

  const goToMenu = () => {
    setPhase('menu');
    setShowGameOver(false);
    setShowVictory(false);
    setShowCrafting(false);
    setShowMap(false);
    setShowSettings(false);
    setShowStoryLore(false);
    setEngine(null);
    soundEngine.startMusic('title');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white select-none font-mono">
      {/* 1. RETRO 8-BIT TITLE MENU */}
      {phase === 'menu' && (
        <RetroTitleMenu
          profile={profile}
          onStartSurvival={() => startSurvivalGame('none')}
          onOpenStoryLore={() => setShowStoryLore(true)}
          onOpenDaily={() => setShowDaily(true)}
          onOpenShop={() => setShowShop(true)}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenCloudSync={() => setShowCloudSync(true)}
        />
      )}

      {/* 2. PLAYING PHASE */}
      {phase === 'playing' && engine && (
        <div className="relative w-full h-full">
          {/* Main 8-bit Game Canvas */}
          <GameCanvas
            engine={engine}
            crtFilter={settings.crtFilter}
            onCanvasClick={() => {}}
          />

          {/* Virtual NES Controller HUD */}
          <VirtualNESController
            engine={engine}
            onOpenCrafting={() => setShowCrafting(true)}
            onOpenMap={() => setShowMap(true)}
            onTogglePause={() => setShowSettings(true)}
          />
        </div>
      )}

      {/* Modals & Overlays */}
      {showStoryLore && (
        <StoryLoreModal onClose={() => setShowStoryLore(false)} />
      )}

      {showCrafting && engine && (
        <InventoryCraftingModal
          engine={engine}
          onClose={() => setShowCrafting(false)}
        />
      )}

      {showMap && engine && (
        <MapModal
          engine={engine}
          onClose={() => setShowMap(false)}
        />
      )}

      {showShop && (
        <ShopModal
          profile={profile}
          onUpdateProfile={setProfile}
          onClose={() => setShowShop(false)}
        />
      )}

      {showLeaderboard && (
        <LeaderboardModal onClose={() => setShowLeaderboard(false)} />
      )}

      {showDaily && (
        <DailyChallengeModal
          onStartDaily={handleStartDaily}
          onClose={() => setShowDaily(false)}
        />
      )}

      {showCloudSync && (
        <CloudSyncModal
          profile={profile}
          onProfileLoaded={setProfile}
          onClose={() => setShowCloudSync(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={setSettings}
          onClose={() => setShowSettings(false)}
          onExitGame={phase === 'playing' ? goToMenu : undefined}
        />
      )}

      {showGameOver && engine && (
        <GameOverModal
          engine={engine}
          onRestart={() => startSurvivalGame(engine.state.dailyModifier)}
          onGoToMenu={goToMenu}
        />
      )}

      {showVictory && engine && (
        <VictoryModal
          engine={engine}
          onGoToMenu={goToMenu}
        />
      )}
    </div>
  );
}
