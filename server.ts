import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory persistent state with fallback default data
interface LeaderboardEntry {
  id: string;
  playerName: string;
  nightReached: number;
  score: number;
  kills: number;
  timeSurvivedSeconds: number;
  skin: string;
  date: string;
  isDaily?: boolean;
}

interface UserProfile {
  syncCode: string;
  playerName: string;
  highestNight: number;
  totalKills: number;
  gold: number;
  unlockedSkins: string[];
  unlockedPets: string[];
  unlockedFireStyles: string[];
  activeSkin: string;
  activePet: string;
  activeFireStyle: string;
  skills: Record<string, number>;
  lastSaved: string;
  dailyStreak: number;
  lastDailyDate: string;
}

const cloudProfiles = new Map<string, UserProfile>();

const globalLeaderboard: LeaderboardEntry[] = [
  { id: '1', playerName: 'PixelSurvivor', nightReached: 99, score: 154200, kills: 480, timeSurvivedSeconds: 3600, skin: 'lumberjack_master', date: '2026-08-19' },
  { id: '2', playerName: 'ForestGhost', nightReached: 84, score: 112000, kills: 360, timeSurvivedSeconds: 2900, skin: 'shadow_hunter', date: '2026-08-18' },
  { id: '3', playerName: 'DonLeñador', nightReached: 71, score: 94500, kills: 290, timeSurvivedSeconds: 2400, skin: 'retro_hero', date: '2026-08-17' },
  { id: '4', playerName: 'NocheOscura', nightReached: 55, score: 68000, kills: 210, timeSurvivedSeconds: 1950, skin: 'hazmat', date: '2026-08-16' },
  { id: '5', playerName: 'CampistaPro', nightReached: 42, score: 51200, kills: 160, timeSurvivedSeconds: 1500, skin: 'classic', date: '2026-08-15' },
  { id: '6', playerName: 'LoboSolitario', nightReached: 33, score: 39000, kills: 120, timeSurvivedSeconds: 1200, skin: 'classic', date: '2026-08-14' },
];

const dailyLeaderboard: LeaderboardEntry[] = [
  { id: 'd1', playerName: 'FuegoEterno', nightReached: 28, score: 45000, kills: 130, timeSurvivedSeconds: 980, skin: 'shadow_hunter', date: new Date().toISOString().split('T')[0], isDaily: true },
  { id: 'd2', playerName: 'Explorador8Bit', nightReached: 21, score: 31000, kills: 95, timeSurvivedSeconds: 740, skin: 'retro_hero', date: new Date().toISOString().split('T')[0], isDaily: true },
  { id: 'd3', playerName: 'PixelWood', nightReached: 15, score: 19500, kills: 62, timeSurvivedSeconds: 520, skin: 'classic', date: new Date().toISOString().split('T')[0], isDaily: true },
];

// Helper to get daily challenge details based on current date
function getTodayChallenge() {
  const today = new Date().toISOString().split('T')[0];
  // Deterministic challenge generation based on date
  const dayNum = new Date().getDate();
  const challenges = [
    {
      id: `daily-${today}`,
      title: 'Noche de Niebla Venenosa',
      description: 'La niebla cubre el bosque. La visibilidad es 40% menor, pero los cofres contienen el doble de oro y recursos raros.',
      modifier: 'fog_poison',
      difficulty: 'Dificultad: Alta',
      rewardGold: 400,
      rewardSkin: 'hazmat',
      targetNight: 20,
    },
    {
      id: `daily-${today}`,
      title: 'Furia de las Bestias de Sombra',
      description: 'Los monstruos tienen +30% de velocidad y salud, pero otorgan triple experiencia al ser derrotados.',
      modifier: 'shadow_fury',
      difficulty: 'Dificultad: Extrema',
      rewardGold: 500,
      rewardSkin: 'shadow_hunter',
      targetNight: 25,
    },
    {
      id: `daily-${today}`,
      title: 'Helada Polar del Bosque',
      description: 'El frío de la noche reduce el calor 2x más rápido. Mantén la fogata en nivel alto para sobrevivir.',
      modifier: 'polar_freeze',
      difficulty: 'Dificultad: Media',
      rewardGold: 350,
      rewardSkin: 'lumberjack_master',
      targetNight: 15,
    },
    {
      id: `daily-${today}`,
      title: 'Solo Armas Primitivas',
      description: 'No hay armas de fuego. Solo arco, lanzas y hachas. +50% de daño cuerpo a cuerpo.',
      modifier: 'primitive_only',
      difficulty: 'Dificultad: Desafío',
      rewardGold: 450,
      rewardSkin: 'shaman_forest',
      targetNight: 20,
    }
  ];
  return {
    date: today,
    challenge: challenges[dayNum % challenges.length]
  };
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Leaderboard API
app.get('/api/leaderboard', (req, res) => {
  const type = req.query.type as string;
  if (type === 'daily') {
    res.json({ success: true, leaderboard: dailyLeaderboard.sort((a, b) => b.score - a.score) });
  } else {
    res.json({ success: true, leaderboard: globalLeaderboard.sort((a, b) => b.score - a.score) });
  }
});

app.post('/api/leaderboard', (req, res) => {
  const { playerName, nightReached, score, kills, timeSurvivedSeconds, skin, isDaily } = req.body;
  if (!playerName || nightReached === undefined || score === undefined) {
    res.status(400).json({ error: 'Datos incompletos' });
    return;
  }

  const newEntry: LeaderboardEntry = {
    id: `run-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    playerName: String(playerName).substring(0, 16),
    nightReached: Number(nightReached),
    score: Number(score),
    kills: Number(kills || 0),
    timeSurvivedSeconds: Number(timeSurvivedSeconds || 0),
    skin: String(skin || 'classic'),
    date: new Date().toISOString().split('T')[0],
    isDaily: Boolean(isDaily)
  };

  if (isDaily) {
    dailyLeaderboard.push(newEntry);
    dailyLeaderboard.sort((a, b) => b.score - a.score);
    if (dailyLeaderboard.length > 50) dailyLeaderboard.pop();
  } else {
    globalLeaderboard.push(newEntry);
    globalLeaderboard.sort((a, b) => b.score - a.score);
    if (globalLeaderboard.length > 100) globalLeaderboard.pop();
  }

  res.json({ success: true, entry: newEntry });
});

// Daily Challenge API
app.get('/api/daily-challenge', (req, res) => {
  res.json({ success: true, ...getTodayChallenge() });
});

// Cloud Sync & Save API
app.post('/api/cloud/save', (req, res) => {
  const { syncCode, profile } = req.body;
  if (!syncCode || !profile) {
    res.status(400).json({ error: 'Falta syncCode o datos de perfil' });
    return;
  }

  const cleanCode = String(syncCode).trim().toUpperCase();
  const updatedProfile: UserProfile = {
    ...profile,
    syncCode: cleanCode,
    lastSaved: new Date().toISOString()
  };

  cloudProfiles.set(cleanCode, updatedProfile);
  res.json({ success: true, message: 'Partida guardada en la nube con éxito', syncCode: cleanCode });
});

app.get('/api/cloud/load/:syncCode', (req, res) => {
  const cleanCode = String(req.params.syncCode).trim().toUpperCase();
  const profile = cloudProfiles.get(cleanCode);

  if (!profile) {
    res.status(404).json({ error: 'Código de sincronización no encontrado en la nube' });
    return;
  }

  res.json({ success: true, profile });
});

// Gemini AI Sage & Oracle Endpoint (Interactive Retro Famicom Dialogue & Lore)
app.post('/api/sage-oracle', async (req, res) => {
  const { npcName, locationType, night, hp, warmth, inventoryItems } = req.body;

  const fallbackQuotes: Record<string, string[]> = {
    cave: [
      'ES PELIGROSO IR SOLO EN LA NOCHE. MANTÉN EL FUEGO VIVO Y AFILA TU HOJA.',
      'EN LA NOCHE 10, EL CIERVO CORRUPTO DESCENDERÁ DE LOS RISCOS DEL NORTE.',
      'LAS AGUAS SUBTERRÁNEAS PURIFICAN EL ESPÍRITU. GUARDA TUS FLECHAS PARA LA LUNA ROJA.',
      'HACE CIEN AÑOS EL WENDIGO FUE SELLADO EN LA NOCHE 99. SOLO UN HÉROE ARMADO LO VENCERÁ.'
    ],
    cabin: [
      'REFÚGIATE AQUÍ SI EL FRÍO TE AGOTA. LA CHIMENEA CONSERVARÁ TU CALOR.',
      'SI COCINAS LA CARNE EN EL FUEGO, TU FUERZA Y RESISTENCIA SE DUPLICARÁN.',
      'LOS MONSTRUOS NO PUEDEN DERRIBAR LAS PAREDES DE PIEDRA FÁCILMENTE. COLOCA TRAMPAS AFUERA.',
      'REVISA EL COFRE TRASERO. HE GUARDADO LINGOTES Y POCIONES PARA EL SUPERVIVIENTE.'
    ]
  };

  const pool = locationType === 'cabin' ? fallbackQuotes.cabin : fallbackQuotes.cave;
  const defaultFallback = pool[Math.floor(Math.random() * pool.length)];

  if (!process.env.GEMINI_API_KEY) {
    res.json({ success: true, text: defaultFallback });
    return;
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: `Eres el Sabio Anciano / Ermitaño en un juego retro de 8 bits estilo The Legend of Zelda de Famicom/NES (1986) en español.
El jugador ha entrado a tu ${locationType === 'cabin' ? 'cabaña en el bosque' : 'cueva secreta'}.
Datos actuales de la partida:
- Noche actual: ${night || 1} de 99 noches
- Salud del jugador: ${hp || 100}%
- Nivel de calor: ${warmth || 100}%
- Inventario: ${(inventoryItems || []).join(', ') || 'recursos básicos'}

Instrucciones:
1. Responde con 1 o 2 oraciones breves, en mayúsculas estilo clásico de Family Game / NES (máximo 120 caracteres).
2. Da un consejo críptico, útil o una profecía sobre cómo sobrevivir las 99 noches, el frío o los monstruos de la noche.
3. Tono solemne y misterioso de 8-bit.`,
    });

    const advice = response.text?.trim().toUpperCase() || defaultFallback;
    res.json({ success: true, text: advice });
  } catch (err) {
    res.json({ success: true, text: defaultFallback });
  }
});

async function startServer() {
  // Vite middleware in dev, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌲 99 Noches en el Bosque 8-Bit Server running on port ${PORT}`);
  });
}

startServer();
