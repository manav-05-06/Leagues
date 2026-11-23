import { useState, useEffect, useReducer, useRef, useMemo, useCallback } from 'react';
import {
  boardReducer,
  createInitialState,
  clamp,
} from './boardState.js';
import { encode, decode } from './boardCodec.js';
import { resolveTeamColors } from '../../utils/teamColors.js';
import {
  fetchLeagueTeams,
  fetchTeamSquad,
  fetchTeamLastLineup,
  fetchMatchLineups,
} from '../../api.js';
import { useAppStore } from '../../store.js';
import './Tactics.css';

// Subcomponents
import Pitch from './Pitch';
import PlayerToken from './PlayerToken';
import SquadPanel from './SquadPanel';
import BoardToolbar from './BoardToolbar';
import TeamPicker from './TeamPicker';
import SavedBoardsSheet from './SavedBoardsSheet';
import { saveBoardToStorage } from './savedBoardsStorage';
import { exportBoardToImage } from './exportImage';

export default function TacticsBoard() {
  const [state, dispatch] = useReducer(boardReducer, null, () => createInitialState());

  const svgRef = useRef(null);

  // Active modals
  const [teamPickerSide, setTeamPickerSide] = useState(null);
  const [isSavedBoardsOpen, setIsSavedBoardsOpen] = useState(false);

  // Active selections & drag tracking
  const [selectedSquadPlayer, setSelectedSquadPlayer] = useState(null);
  const [activePitchPlayer, setActivePitchPlayer] = useState(null);
  const [dragging, setDragging] = useState(null);

  // Mobile squad tab ('a' | 'b')
  const [mobileSquadTab, setMobileSquadTab] = useState('a');

  // Match lineups if available from seed
  const [matchLineups, setMatchLineups] = useState(null);

  // Store seed
  const tacticsSeed = useAppStore((s) => s.tacticsSeed);
  const setTacticsSeed = useAppStore((s) => s.setTacticsSeed);

  // Resolve team colors with clash prevention
  const colors = useMemo(() => {
    return resolveTeamColors(state.teams.a, state.teams.b);
  }, [state.teams.a, state.teams.b]);

  // Load team data helper
  const loadTeamData = useCallback(async (side, league, teamId, teamMeta = {}, preferredFormation = null) => {
    if (!league || !teamId) return;
    try {
      if (teamMeta.name) {
        dispatch({
          type: 'SET_NOTICE',
          notice: `Loading squad for ${teamMeta.name}...`,
        });
      }

      const squad = await fetchTeamSquad(league, teamId);
      dispatch({
        type: 'LOAD_TEAM',
        side,
        team: {
          league,
          teamId,
          name: teamMeta.name,
          color: teamMeta.color,
          altColor: teamMeta.altColor,
          logo: teamMeta.logo,
          formation: preferredFormation || teamMeta.formation,
        },
        squad,
      });

      // Attempt to load team's last match lineup with safe fallback to AUTO_PICK
      try {
        const lastLineup = await fetchTeamLastLineup(league, teamId);
        if (lastLineup && lastLineup.starters?.length >= 11) {
          dispatch({
            type: 'LOAD_LINEUP',
            side,
            lineup: lastLineup,
            sourceType: 'last-match',
            label: `Starting XI vs ${lastLineup.opponent}${lastLineup.date ? ` (${lastLineup.date})` : ''}`,
          });
        } else {
          dispatch({ type: 'AUTO_PICK', side });
        }
      } catch (lineupErr) {
        console.warn(`Lineup fetch failed for ${side}, using auto-pick:`, lineupErr);
        dispatch({ type: 'AUTO_PICK', side });
      }

      dispatch({ type: 'CLEAR_NOTICE' });
    } catch (err) {
      console.error(`Failed to load squad for ${side}:`, err);
      dispatch({
        type: 'SET_NOTICE',
        notice: `Could not load squad for ${teamMeta.name || 'this team'}. Please check your connection or choose another team.`,
      });
    }
  }, []);

  // Load board from encoded code
  const loadFromCode = useCallback(async (code) => {
    const decoded = decode(code);
    if (!decoded) {
      dispatch({ type: 'SET_NOTICE', notice: "This link doesn't work" });
      return;
    }

    try {
      const [teamsA, teamsB] = await Promise.all([
        decoded.a.l ? fetchLeagueTeams(decoded.a.l) : [],
        decoded.b.l ? fetchLeagueTeams(decoded.b.l) : [],
      ]);
      const metaA = teamsA.find((t) => t.id === decoded.a.t) || {};
      const metaB = teamsB.find((t) => t.id === decoded.b.t) || {};

      const [squadA, squadB] = await Promise.all([
        fetchTeamSquad(decoded.a.l, decoded.a.t),
        fetchTeamSquad(decoded.b.l, decoded.b.t),
      ]);

      dispatch({
        type: 'LOAD_TEAM',
        side: 'a',
        team: {
          ...metaA,
          league: decoded.a.l,
          teamId: decoded.a.t,
          name: metaA.name || decoded.a.t,
          formation: decoded.a.f,
        },
        squad: squadA,
      });

      dispatch({
        type: 'LOAD_TEAM',
        side: 'b',
        team: {
          ...metaB,
          league: decoded.b.l,
          teamId: decoded.b.t,
          name: metaB.name || decoded.b.t,
          formation: decoded.b.f,
        },
        squad: squadB,
      });

      if (decoded.n) {
        dispatch({ type: 'SET_NAME', name: decoded.n });
      }

      if (decoded.bt) {
        dispatch({ type: 'SET_BOTTOM', bottom: decoded.bt });
      }

      for (const side of ['a', 'b']) {
        const players = decoded[side].p;
        for (const [id, x, y, slot] of players) {
          dispatch({
            type: 'PLACE',
            side,
            playerId: id,
            x,
            y,
            slot,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load board from code:', err);
      dispatch({ type: 'SET_NOTICE', notice: "This link doesn't work" });
    }
  }, []);

  // 1. Initial Load: Seed from match, URL hash, or defaults (Al Ahli vs Al Nassr)
  useEffect(() => {
    let handled = false;

    // Check seed first
    if (tacticsSeed && tacticsSeed.home && tacticsSeed.away) {
      handled = true;
      const { league, eventId, home, away } = tacticsSeed;
      setTacticsSeed(null); // clear seed once consumed

      const initFromSeed = async () => {
        // Fetch match lineups if eventId is set
        if (eventId) {
          try {
            const lineups = await fetchMatchLineups(eventId);
            setMatchLineups(lineups);
            if (lineups.home && lineups.away) {
              await loadTeamData('a', league, home.id, home, lineups.home.formation);
              await loadTeamData('b', league, away.id, away, lineups.away.formation);
              dispatch({
                type: 'LOAD_LINEUP',
                side: 'a',
                lineup: lineups.home,
                sourceType: 'this-match',
                label: 'Official match lineup',
              });
              dispatch({
                type: 'LOAD_LINEUP',
                side: 'b',
                lineup: lineups.away,
                sourceType: 'this-match',
                label: 'Official match lineup',
              });
              return;
            }
          } catch (e) {
            console.error('Failed to fetch match lineups:', e);
          }
        }

        await loadTeamData('a', league, home.id, home);
        await loadTeamData('b', league, away.id, away);
      };

      initFromSeed();
      return;
    }

    // Check URL hash (#tactics=<code>)
    const hash = window.location.hash || '';
    if (hash.startsWith('#tactics=')) {
      const code = hash.replace('#tactics=', '').trim();
      handled = true;
      loadFromCode(code);
      return;
    }

    // Default: Al Ahli vs Al Nassr (Saudi Pro League ksa.1)
    if (!handled && !state.teams.a.teamId) {
      loadTeamData('a', 'ksa.1', '816', { name: 'Al Ahli', color: '#00ff87' });
      loadTeamData('b', 'ksa.1', '817', { name: 'Al Nassr', color: '#f7f316' });
    }
  }, [tacticsSeed, setTacticsSeed, loadTeamData, loadFromCode, state.teams.a.teamId]);

  // Listen to hashchange events (for opening saved boards or pasting links)
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash || '';
      if (hash.startsWith('#tactics=')) {
        const code = hash.replace('#tactics=', '').trim();
        loadFromCode(code);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [loadFromCode]);

  // Convert client pointer event coordinates to 0..100 board space
  const getBoardCoordinates = useCallback((clientX, clientY) => {
    if (!svgRef.current) return { x: 50, y: 50 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    const x = clamp((svgPt.x / 68) * 100, 1, 99);
    const y = clamp((svgPt.y / 105) * 100, 1, 99);
    return {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    };
  }, []);

  // Handle pointer down on a player token on pitch
  const handleTokenPointerDown = (e, player, side) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActivePitchPlayer(player);
    setSelectedSquadPlayer(null);

    setDragging({
      player,
      side,
      pointerId: e.pointerId,
      currentX: player.x,
      currentY: player.y,
    });
  };

  // Handle pointer move on pitch
  const handlePitchPointerMove = (e) => {
    if (!dragging) return;
    const { x, y } = getBoardCoordinates(e.clientX, e.clientY);
    setDragging((prev) => (prev ? { ...prev, currentX: x, currentY: y } : null));
  };

  // Handle pointer up on pitch
  const handlePitchPointerUp = (e) => {
    if (!dragging) return;
    const { x, y } = getBoardCoordinates(e.clientX, e.clientY);
    const { player, side } = dragging;

    // Check if dropped directly onto another player on pitch for a swap
    const team = state.teams[side];
    const targetPlayer = team.onPitch.find(
      (p) => String(p.id) !== String(player.id) && Math.hypot(p.x - x, p.y - y) < 6
    );

    if (targetPlayer) {
      dispatch({
        type: 'SWAP',
        side,
        idA: player.id,
        idB: targetPlayer.id,
      });
    } else {
      dispatch({
        type: 'MOVE',
        side,
        playerId: player.id,
        x,
        y,
      });
    }

    setDragging(null);
  };

  // Click on Pitch background: if a squad player was selected (tap-to-place), place them
  const handlePitchClick = (e) => {
    if (selectedSquadPlayer) {
      const { x, y } = getBoardCoordinates(e.clientX, e.clientY);
      dispatch({
        type: 'PLACE',
        side: selectedSquadPlayer.side,
        playerId: selectedSquadPlayer.player.id,
        x,
        y,
      });
      setSelectedSquadPlayer(null);
    } else {
      setActivePitchPlayer(null);
    }
  };

  // Keyboard navigation for active pitch player
  const handleTokenKeyDown = (e, player, side) => {
    const step = e.shiftKey ? 5 : 1;
    let dx = 0;
    let dy = 0;

    if (e.key === 'ArrowUp') dy -= step;
    else if (e.key === 'ArrowDown') dy += step;
    else if (e.key === 'ArrowLeft') dx -= step;
    else if (e.key === 'ArrowRight') dx += step;
    else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      dispatch({ type: 'BENCH', side, playerId: player.id });
      setActivePitchPlayer(null);
      return;
    } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      dispatch({ type: 'UNDO' });
      return;
    } else {
      return;
    }

    e.preventDefault();
    dispatch({
      type: 'MOVE',
      side,
      playerId: player.id,
      x: clamp(player.x + dx, 1, 99),
      y: clamp(player.y + dy, 1, 99),
    });
  };

  // Squad player tap handling
  const handleSelectSquadPlayer = (player, side) => {
    const team = state.teams[side];
    const isOnPitch = team.onPitch.some((p) => String(p.id) === String(player.id));

    if (isOnPitch) {
      // Bench the player
      dispatch({ type: 'BENCH', side, playerId: player.id });
      if (activePitchPlayer?.id === player.id) setActivePitchPlayer(null);
      return;
    }

    // If an active pitch player is selected, swap with this squad player
    if (activePitchPlayer && activePitchPlayer.side === side) {
      dispatch({
        type: 'SWAP',
        side,
        idA: player.id,
        idB: activePitchPlayer.id,
      });
      setActivePitchPlayer(null);
      return;
    }

    // Toggle selected squad player for tap-to-place
    if (selectedSquadPlayer?.player?.id === player.id) {
      setSelectedSquadPlayer(null);
    } else {
      setSelectedSquadPlayer({ player, side });
    }
  };

  // Team picker selection
  const handleSelectTeam = (side, league, team) => {
    loadTeamData(side, league, team.id, team);
  };

  // Start from selection
  const handleSelectStartFrom = async (sourceType) => {
    for (const side of ['a', 'b']) {
      if (sourceType === 'empty') {
        dispatch({ type: 'RESET', side });
      } else if (sourceType === 'auto') {
        dispatch({ type: 'AUTO_PICK', side });
      } else if (sourceType === 'this-match' && matchLineups) {
        const sideLineup = side === 'a' ? matchLineups.home : matchLineups.away;
        if (sideLineup) {
          dispatch({
            type: 'LOAD_LINEUP',
            side,
            lineup: sideLineup,
            sourceType: 'this-match',
            label: 'This match\'s lineup',
          });
        }
      } else if (sourceType === 'last-match') {
        const team = state.teams[side];
        const lastLineup = await fetchTeamLastLineup(team.league, team.teamId);
        if (lastLineup && lastLineup.starters?.length >= 11) {
          dispatch({
            type: 'LOAD_LINEUP',
            side,
            lineup: lastLineup,
            sourceType: 'last-match',
            label: `Starting XI vs ${lastLineup.opponent}${lastLineup.date ? ` (${lastLineup.date})` : ''}`,
          });
        } else {
          dispatch({ type: 'AUTO_PICK', side });
        }
      }
    }
  };

  // Save board to local storage
  const handleSaveBoard = () => {
    const code = encode(state);
    const success = saveBoardToStorage(state.name, code);
    if (success) {
      alert('Board saved to this device!');
    } else {
      alert("Couldn't save on this device (storage full or disabled).");
    }
  };

  // Share board link
  const handleShareLink = () => {
    const code = encode(state);
    const url = `${window.location.origin}${window.location.pathname}#tactics=${code}`;
    if (navigator.share) {
      navigator.share({ title: state.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert('Tactics board link copied to clipboard!');
      });
    }
  };

  // Export board image
  const handleExportImage = () => {
    if (svgRef.current) {
      exportBoardToImage(svgRef.current, state);
    }
  };

  // Restore saved board code
  const handleLoadBoardCode = (code) => {
    window.location.hash = `#tactics=${code}`;
    loadFromCode(code);
  };

  return (
    <div className="tactics-board-page">
      {/* Notice Banner */}
      {state.notice && (
        <div className="tactics-notice-banner" role="alert">
          <span>{state.notice}</span>
          <button
            type="button"
            className="tactics-notice-close"
            onClick={() => dispatch({ type: 'CLEAR_NOTICE' })}
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Toolbar */}
      <BoardToolbar
        board={state}
        hasMatchLineup={Boolean(matchLineups?.home && matchLineups?.away)}
        canUndo={state.history?.length > 0}
        onOpenTeamPicker={(side) => setTeamPickerSide(side)}
        onChangeFormation={(side, formation) => dispatch({ type: 'SET_FORMATION', side, formation })}
        onSelectStartFrom={handleSelectStartFrom}
        onFlip={() => dispatch({ type: 'FLIP' })}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onReset={() => {
          dispatch({ type: 'RESET', side: 'a' });
          dispatch({ type: 'RESET', side: 'b' });
        }}
        onSaveBoard={handleSaveBoard}
        onOpenSavedBoards={() => setIsSavedBoardsOpen(true)}
        onShareLink={handleShareLink}
        onExportImage={handleExportImage}
      />

      {/* Main 3-Column Board Layout */}
      <div className="tactics-board-grid">
        {/* Team A Desktop Squad Panel */}
        <div className="desktop-squad-col">
          <SquadPanel
            side="a"
            team={{ ...state.teams.a, color: colors.home }}
            sourceLabel={state.sourceLabel.a}
            selectedPlayerId={selectedSquadPlayer?.side === 'a' ? selectedSquadPlayer.player.id : null}
            onSelectSquadPlayer={handleSelectSquadPlayer}
            onOpenTeamPicker={() => setTeamPickerSide('a')}
          />
        </div>

        {/* Pitch Area */}
        <div onClick={handlePitchClick}>
          <Pitch
            svgRef={svgRef}
            onPointerMove={handlePitchPointerMove}
            onPointerUp={handlePitchPointerUp}
          >
            {/* Team A Players */}
            {state.teams.a.onPitch.map((player) => (
              <PlayerToken
                key={`a-${player.id}`}
                player={
                  dragging?.player?.id === player.id
                    ? { ...player, x: dragging.currentX, y: dragging.currentY }
                    : player
                }
                side="a"
                teamName={state.teams.a.name}
                color={colors.home}
                isSelected={activePitchPlayer?.id === player.id}
                isDragging={dragging?.player?.id === player.id}
                onPointerDown={handleTokenPointerDown}
                onKeyDown={handleTokenKeyDown}
              />
            ))}

            {/* Team B Players */}
            {state.teams.b.onPitch.map((player) => (
              <PlayerToken
                key={`b-${player.id}`}
                player={
                  dragging?.player?.id === player.id
                    ? { ...player, x: dragging.currentX, y: dragging.currentY }
                    : player
                }
                side="b"
                teamName={state.teams.b.name}
                color={colors.away}
                isSelected={activePitchPlayer?.id === player.id}
                isDragging={dragging?.player?.id === player.id}
                onPointerDown={handleTokenPointerDown}
                onKeyDown={handleTokenKeyDown}
              />
            ))}
          </Pitch>
        </div>

        {/* Team B Desktop Squad Panel */}
        <div className="desktop-squad-col">
          <SquadPanel
            side="b"
            team={{ ...state.teams.b, color: colors.away }}
            sourceLabel={state.sourceLabel.b}
            selectedPlayerId={selectedSquadPlayer?.side === 'b' ? selectedSquadPlayer.player.id : null}
            onSelectSquadPlayer={handleSelectSquadPlayer}
            onOpenTeamPicker={() => setTeamPickerSide('b')}
          />
        </div>

        {/* Responsive Squad Drawer for Viewports < 1024px */}
        <div className="mobile-squad-drawer">
          <div className="mobile-squad-tabs" role="tablist">
            <button
              type="button"
              className={`mobile-squad-tab-btn ${mobileSquadTab === 'a' ? 'active' : ''}`}
              onClick={() => setMobileSquadTab('a')}
            >
              {state.teams.a.name} Squad ({state.teams.a.onPitch.length}/11)
            </button>
            <button
              type="button"
              className={`mobile-squad-tab-btn ${mobileSquadTab === 'b' ? 'active' : ''}`}
              onClick={() => setMobileSquadTab('b')}
            >
              {state.teams.b.name} Squad ({state.teams.b.onPitch.length}/11)
            </button>
          </div>

          <SquadPanel
            side={mobileSquadTab}
            team={{
              ...state.teams[mobileSquadTab],
              color: mobileSquadTab === 'a' ? colors.home : colors.away,
            }}
            sourceLabel={state.sourceLabel[mobileSquadTab]}
            selectedPlayerId={selectedSquadPlayer?.side === mobileSquadTab ? selectedSquadPlayer.player.id : null}
            onSelectSquadPlayer={handleSelectSquadPlayer}
            onOpenTeamPicker={() => setTeamPickerSide(mobileSquadTab)}
          />
        </div>
      </div>

      {/* Team Picker Modal */}
      <TeamPicker
        isOpen={Boolean(teamPickerSide)}
        side={teamPickerSide}
        currentTeam={teamPickerSide ? state.teams[teamPickerSide] : null}
        onClose={() => setTeamPickerSide(null)}
        onSelectTeam={handleSelectTeam}
      />

      {/* Saved Boards Sheet */}
      <SavedBoardsSheet
        isOpen={isSavedBoardsOpen}
        onClose={() => setIsSavedBoardsOpen(false)}
        onLoadBoardCode={handleLoadBoardCode}
      />
    </div>
  );
}
