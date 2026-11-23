import { FORMATION_LAYOUTS } from '../../constants/formations.js';

export const MAX_PLAYERS_PER_TEAM = 11;
const MAX_HISTORY = 30;

export function clamp(val, min = 1, max = 99) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Calculates board coordinates (0-100 x 0-100) for a given formation slot.
 *
 * @param {string} formation - e.g. '4-2-3-1'
 * @param {number} slot - 1 to 11
 * @param {boolean} isBottom - true if team attacks upwards from bottom
 * @returns {{ x: number, y: number, role: string }}
 */
export function getSlotCoord(formation, slot, isBottom) {
  const layouts = FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS['4-3-3'] || {};
  const layout = layouts[slot] || { x: 50, y: 50, role: '' };

  const x = isBottom ? layout.x : 100 - layout.x;
  const y = isBottom ? 50 + layout.y * 0.5 : 50 - layout.y * 0.5;

  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    role: layout.role || '',
  };
}

export function createInitialState(overrides = {}) {
  return {
    version: 1,
    name: 'Tactics Board',
    bottom: 'b', // side 'b' is drawn at the bottom (attacks up)
    source: { a: 'empty', b: 'empty' },
    sourceLabel: { a: 'Pick a starting lineup', b: 'Pick a starting lineup' },
    teams: {
      a: {
        league: '',
        teamId: '',
        name: 'Team A',
        short: '',
        color: '#00ff87',
        altColor: null,
        logo: '',
        formation: '4-3-3',
        onPitch: [],
        squad: [],
      },
      b: {
        league: '',
        teamId: '',
        name: 'Team B',
        short: '',
        color: '#00f2fe',
        altColor: null,
        logo: '',
        formation: '4-3-3',
        onPitch: [],
        squad: [],
      },
    },
    history: [],
    notice: null,
    ...overrides,
  };
}

function pushHistory(state) {
  const snapshot = {
    name: state.name,
    bottom: state.bottom,
    source: { ...state.source },
    sourceLabel: { ...state.sourceLabel },
    teams: {
      a: {
        ...state.teams.a,
        onPitch: state.teams.a.onPitch.map((p) => ({ ...p })),
      },
      b: {
        ...state.teams.b,
        onPitch: state.teams.b.onPitch.map((p) => ({ ...p })),
      },
    },
  };
  const history = (state.history || []).slice(-(MAX_HISTORY - 1));
  return [...history, snapshot];
}

export function boardReducer(state, action) {
  switch (action.type) {
    case 'LOAD_TEAM': {
      const { side, team = {}, squad = [] } = action;
      if (!side || !state.teams[side]) return state;

      const nextHistory = pushHistory(state);
      const isSideB = side === 'b';
      const defaultFormation = team.formation || (isSideB ? '4-4-1-1' : '4-2-3-1');

      const nextTeams = {
        ...state.teams,
        [side]: {
          ...state.teams[side],
          league: team.league || state.teams[side].league,
          teamId: String(team.teamId || team.id || ''),
          name: team.name || `Team ${side.toUpperCase()}`,
          short: team.short || '',
          color: team.color || state.teams[side].color,
          altColor: team.altColor || null,
          logo: team.logo || '',
          formation: defaultFormation,
          squad: Array.isArray(squad) ? squad : [],
          onPitch: [],
        },
      };

      const teamAName = side === 'a' ? (team.name || 'Team A') : state.teams.a.name;
      const teamBName = side === 'b' ? (team.name || 'Team B') : state.teams.b.name;

      return {
        ...state,
        name: `${teamAName} vs ${teamBName}`,
        teams: nextTeams,
        source: { ...state.source, [side]: 'empty' },
        sourceLabel: { ...state.sourceLabel, [side]: 'Pick a starting lineup' },
        notice: null,
        history: nextHistory,
      };
    }

    case 'LOAD_LINEUP': {
      const { side, lineup, sourceType = 'last-match', label } = action;
      if (!side || !lineup || !state.teams[side]) return state;

      const nextHistory = pushHistory(state);
      const team = state.teams[side];
      const isBottom = state.bottom === side;
      const formation = lineup.formation || team.formation || '4-3-3';

      const starters = lineup.starters || [];
      const onPitch = [];

      starters.slice(0, MAX_PLAYERS_PER_TEAM).forEach((st, idx) => {
        const slot = Number(st.slot) || idx + 1;
        const coords = getSlotCoord(formation, slot, isBottom);
        const squadPlayer = team.squad.find((p) => String(p.id) === String(st.id));

        onPitch.push({
          id: String(st.id),
          name: squadPlayer?.name || st.name || 'Player',
          shortName: squadPlayer?.shortName || st.name?.split(' ').pop() || 'Player',
          jersey: String(st.jersey ?? squadPlayer?.jersey ?? ''),
          pos: squadPlayer?.pos || (slot === 1 ? 'G' : 'M'),
          slot,
          x: coords.x,
          y: coords.y,
        });
      });

      return {
        ...state,
        teams: {
          ...state.teams,
          [side]: {
            ...team,
            formation,
            onPitch,
          },
        },
        source: { ...state.source, [side]: sourceType },
        sourceLabel: { ...state.sourceLabel, [side]: label || 'Lineup loaded' },
        notice: null,
        history: nextHistory,
      };
    }

    case 'AUTO_PICK': {
      const { side } = action;
      if (!side || !state.teams[side]) return state;

      const team = state.teams[side];
      const squad = team.squad || [];
      if (squad.length === 0) {
        return { ...state, notice: 'No squad loaded yet' };
      }

      const nextHistory = pushHistory(state);
      const isBottom = state.bottom === side;
      const formation = team.formation || '4-3-3';
      const layouts = FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS['4-3-3'];

      const usedIds = new Set();
      const onPitch = [];

      // Fill slots 1 to 11
      for (let slot = 1; slot <= MAX_PLAYERS_PER_TEAM; slot++) {
        const layout = layouts[slot] || { x: 50, y: 50 };
        // Group by y coordinate in formation
        let targetPos = 'M';
        if (layout.y >= 80) targetPos = 'G';
        else if (layout.y >= 62) targetPos = 'D';
        else if (layout.y >= 30) targetPos = 'M';
        else targetPos = 'F';

        // 1. Match target position
        let player = squad.find((p) => !usedIds.has(p.id) && p.pos === targetPos);

        // 2. If target runs out, pick any available outfield player (or goalkeeper if slot 1)
        if (!player) {
          if (targetPos === 'G') {
            player = squad.find((p) => !usedIds.has(p.id));
          } else {
            player = squad.find((p) => !usedIds.has(p.id) && p.pos !== 'G') || squad.find((p) => !usedIds.has(p.id));
          }
        }

        if (player) {
          usedIds.add(player.id);
          const coords = getSlotCoord(formation, slot, isBottom);
          onPitch.push({
            id: String(player.id),
            name: player.name,
            shortName: player.shortName || player.name.split(' ').pop(),
            jersey: String(player.jersey || ''),
            pos: player.pos || targetPos,
            slot,
            x: coords.x,
            y: coords.y,
          });
        }
      }

      return {
        ...state,
        teams: {
          ...state.teams,
          [side]: {
            ...team,
            onPitch,
          },
        },
        source: { ...state.source, [side]: 'auto' },
        sourceLabel: { ...state.sourceLabel, [side]: 'Auto-picked: not the real lineup' },
        notice: null,
        history: nextHistory,
      };
    }

    case 'PLACE': {
      const { side, playerId, x, y } = action;
      if (!side || !playerId || !state.teams[side]) return state;

      const team = state.teams[side];
      if (team.onPitch.length >= MAX_PLAYERS_PER_TEAM) {
        return { ...state, notice: 'Max 11 players: drag one off first' };
      }

      // Already on pitch?
      if (team.onPitch.some((p) => String(p.id) === String(playerId))) {
        return state;
      }

      const player = team.squad.find((p) => String(p.id) === String(playerId));
      if (!player) return state;

      const nextHistory = pushHistory(state);
      const isBottom = state.bottom === side;
      const formation = team.formation || '4-3-3';

      // Find nearest free slot
      const occupiedSlots = new Set(team.onPitch.map((p) => p.slot));
      let bestSlot = action.slot && !occupiedSlots.has(action.slot) ? action.slot : 1;
      if (!action.slot || occupiedSlots.has(action.slot)) {
        let minDistance = Infinity;
        for (let s = 1; s <= MAX_PLAYERS_PER_TEAM; s++) {
          if (!occupiedSlots.has(s)) {
            const slotCoords = getSlotCoord(formation, s, isBottom);
            const dist = Math.hypot(slotCoords.x - x, slotCoords.y - y);
            if (dist < minDistance) {
              minDistance = dist;
              bestSlot = s;
            }
          }
        }
      }

      const newPlayer = {
        id: String(player.id),
        name: player.name,
        shortName: player.shortName || player.name.split(' ').pop(),
        jersey: String(player.jersey || ''),
        pos: player.pos || 'M',
        slot: bestSlot,
        x: clamp(x, 1, 99),
        y: clamp(y, 1, 99),
      };

      return {
        ...state,
        teams: {
          ...state.teams,
          [side]: {
            ...team,
            onPitch: [...team.onPitch, newPlayer],
          },
        },
        source: { ...state.source, [side]: 'custom' },
        sourceLabel: { ...state.sourceLabel, [side]: 'Your board' },
        notice: null,
        history: nextHistory,
      };
    }

    case 'MOVE': {
      const { side, playerId, x, y } = action;
      if (!side || !playerId || !state.teams[side]) return state;

      const team = state.teams[side];
      const pIdx = team.onPitch.findIndex((p) => String(p.id) === String(playerId));
      if (pIdx === -1) return state;

      const nextHistory = pushHistory(state);
      const nextOnPitch = [...team.onPitch];
      nextOnPitch[pIdx] = {
        ...nextOnPitch[pIdx],
        x: clamp(x, 1, 99),
        y: clamp(y, 1, 99),
      };

      return {
        ...state,
        teams: {
          ...state.teams,
          [side]: {
            ...team,
            onPitch: nextOnPitch,
          },
        },
        source: { ...state.source, [side]: 'custom' },
        sourceLabel: { ...state.sourceLabel, [side]: 'Your board' },
        notice: null,
        history: nextHistory,
      };
    }

    case 'SWAP': {
      const { side, idA, idB } = action;
      if (!side || !idA || !idB || idA === idB || !state.teams[side]) return state;

      const team = state.teams[side];
      const idxA = team.onPitch.findIndex((p) => String(p.id) === String(idA));
      const idxB = team.onPitch.findIndex((p) => String(p.id) === String(idB));

      // Case 1: Both are on pitch
      if (idxA !== -1 && idxB !== -1) {
        const nextHistory = pushHistory(state);
        const nextOnPitch = [...team.onPitch];
        const pA = nextOnPitch[idxA];
        const pB = nextOnPitch[idxB];

        nextOnPitch[idxA] = { ...pA, x: pB.x, y: pB.y, slot: pB.slot };
        nextOnPitch[idxB] = { ...pB, x: pA.x, y: pA.y, slot: pA.slot };

        return {
          ...state,
          teams: {
            ...state.teams,
            [side]: { ...team, onPitch: nextOnPitch },
          },
          source: { ...state.source, [side]: 'custom' },
          sourceLabel: { ...state.sourceLabel, [side]: 'Your board' },
          notice: null,
          history: nextHistory,
        };
      }

      // Case 2: One is squad player, one is on pitch
      const squadPlayerId = idxA === -1 ? idA : idB;
      const pitchPlayerIdx = idxA !== -1 ? idxA : idxB;

      if (pitchPlayerIdx !== -1) {
        const squadPlayer = team.squad.find((p) => String(p.id) === String(squadPlayerId));
        if (!squadPlayer) return state;

        const nextHistory = pushHistory(state);
        const pitchPlayer = team.onPitch[pitchPlayerIdx];
        const nextOnPitch = [...team.onPitch];

        nextOnPitch[pitchPlayerIdx] = {
          id: String(squadPlayer.id),
          name: squadPlayer.name,
          shortName: squadPlayer.shortName || squadPlayer.name.split(' ').pop(),
          jersey: String(squadPlayer.jersey || ''),
          pos: squadPlayer.pos || 'M',
          slot: pitchPlayer.slot,
          x: pitchPlayer.x,
          y: pitchPlayer.y,
        };

        return {
          ...state,
          teams: {
            ...state.teams,
            [side]: { ...team, onPitch: nextOnPitch },
          },
          source: { ...state.source, [side]: 'custom' },
          sourceLabel: { ...state.sourceLabel, [side]: 'Your board' },
          notice: null,
          history: nextHistory,
        };
      }

      return state;
    }

    case 'BENCH': {
      const { side, playerId } = action;
      if (!side || !playerId || !state.teams[side]) return state;

      const team = state.teams[side];
      const hasPlayer = team.onPitch.some((p) => String(p.id) === String(playerId));
      if (!hasPlayer) return state;

      const nextHistory = pushHistory(state);
      return {
        ...state,
        teams: {
          ...state.teams,
          [side]: {
            ...team,
            onPitch: team.onPitch.filter((p) => String(p.id) !== String(playerId)),
          },
        },
        source: { ...state.source, [side]: 'custom' },
        sourceLabel: { ...state.sourceLabel, [side]: 'Your board' },
        notice: null,
        history: nextHistory,
      };
    }

    case 'SET_FORMATION': {
      const { side, formation } = action;
      if (!side || !formation || !state.teams[side]) return state;

      const team = state.teams[side];
      if (team.formation === formation) return state;

      const nextHistory = pushHistory(state);
      const isBottom = state.bottom === side;

      // Reposition all existing players to match new formation slots
      const nextOnPitch = team.onPitch.map((p) => {
        const coords = getSlotCoord(formation, p.slot, isBottom);
        return {
          ...p,
          x: coords.x,
          y: coords.y,
        };
      });

      return {
        ...state,
        teams: {
          ...state.teams,
          [side]: {
            ...team,
            formation,
            onPitch: nextOnPitch,
          },
        },
        source: { ...state.source, [side]: 'custom' },
        sourceLabel: { ...state.sourceLabel, [side]: 'Your board' },
        notice: null,
        history: nextHistory,
      };
    }

    case 'FLIP': {
      const nextHistory = pushHistory(state);
      const nextBottom = state.bottom === 'b' ? 'a' : 'b';

      const updateTeamPos = (side) => {
        const team = state.teams[side];
        const isBottom = nextBottom === side;
        const formation = team.formation || '4-3-3';
        return {
          ...team,
          onPitch: team.onPitch.map((p) => {
            const coords = getSlotCoord(formation, p.slot, isBottom);
            return {
              ...p,
              x: coords.x,
              y: coords.y,
            };
          }),
        };
      };

      return {
        ...state,
        bottom: nextBottom,
        teams: {
          a: updateTeamPos('a'),
          b: updateTeamPos('b'),
        },
        notice: null,
        history: nextHistory,
      };
    }

    case 'RESET': {
      const { side } = action;
      if (!side || !state.teams[side]) return state;

      const nextHistory = pushHistory(state);
      return {
        ...state,
        teams: {
          ...state.teams,
          [side]: {
            ...state.teams[side],
            onPitch: [],
          },
        },
        source: { ...state.source, [side]: 'empty' },
        sourceLabel: { ...state.sourceLabel, [side]: 'Empty pitch' },
        notice: null,
        history: nextHistory,
      };
    }

    case 'UNDO': {
      if (!state.history || state.history.length === 0) return state;

      const history = [...state.history];
      const prev = history.pop();

      return {
        ...state,
        name: prev.name,
        bottom: prev.bottom,
        source: prev.source,
        sourceLabel: prev.sourceLabel,
        teams: {
          a: {
            ...state.teams.a,
            ...prev.teams.a,
            onPitch: prev.teams.a.onPitch,
          },
          b: {
            ...state.teams.b,
            ...prev.teams.b,
            onPitch: prev.teams.b.onPitch,
          },
        },
        notice: null,
        history,
      };
    }

    case 'SET_NAME': {
      return {
        ...state,
        name: action.name || state.name,
      };
    }

    case 'SET_BOTTOM': {
      return {
        ...state,
        bottom: action.bottom === 'a' ? 'a' : 'b',
      };
    }

    case 'SET_NOTICE': {
      return {
        ...state,
        notice: action.notice,
      };
    }

    case 'CLEAR_NOTICE': {
      return {
        ...state,
        notice: null,
      };
    }

    default:
      return state;
  }
}
