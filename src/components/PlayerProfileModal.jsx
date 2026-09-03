import React, { useState, useEffect } from 'react';
import { X, Loader, User, Trophy, Globe, Briefcase, Shield, Sparkles } from 'lucide-react';
import { fetchPlayerProfile, fetchPlayerSeasonStats } from '../api.jsx';
import './PlayerProfileModal.css';
import './FutCard.css';
import { BarChart,Bar,XAxis,Tooltip,ResponsiveContainer,Cell } from 'recharts';

export default function PlayerProfileModal({ playerId, teamId, leagueSlug, season, onClose }) {
  const [profile, setProfile] = useState(null);
  const [seasonStats, setSeasonStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    const getData = async () => {
      try {
        setLoading(true);
        const profileData = await fetchPlayerProfile(playerId);
        
        let statsData = null;
        const targetTeamId = teamId || profileData?.team?.id;
        const targetLeague = leagueSlug || 'eng.1';
        
        if (targetTeamId) {
          statsData = await fetchPlayerSeasonStats(targetTeamId, season, targetLeague, playerId);
        }

        setProfile(profileData);
        setSeasonStats(statsData);
        setError(null);
      } catch (err) {
        setError("Failed to load player scouting profile.");
      } finally {
        setLoading(false);
      }
    };
    
    if (playerId) {
      getData();
    }
  }, [playerId, teamId, leagueSlug, season]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="modal-loading">
          <div className="fut-card-spinner">⚽</div>
          <p>Generating Elite Football Scouting Card...</p>
        </div>
      );
    }

    if (error || !profile) {
      return (
        <div className="modal-loading">
          <p style={{color: 'var(--accent-danger)'}}>{error || "Profile not available"}</p>
        </div>
      );
    }

    const headshot = profile.headshot?.href;
    const flag = profile.flag?.href;
    const name = profile.displayName || profile.fullName;
    const nationality = profile.citizenship;
    const age = profile.age || profile.displayDOB;
    const position = profile.position?.displayName || 'Forward';
    const team = profile.team?.displayName;
    
    let goals = '0';
    let assists = '0';
    let shots = '0';
    let saves = '0';

    if (seasonStats) {
      goals = seasonStats.goals || '0';
      assists = seasonStats.assists || '0';
      shots = seasonStats.shots || '0';
      saves = seasonStats.saves || '0';
    } else if (profile?.statsSummary?.statistics) {
      const stats = profile.statsSummary.statistics;
      const getStat = (abbrev) => stats.find(s => s.abbreviation === abbrev)?.displayValue || '0';
      goals = getStat('G');
      assists = getStat('A');
      shots = getStat('SHOT');
      saves = getStat('SV');
    }

    // Determine position abbreviation (e.g., ST, MID, DEF, GK)
    let posAbbrev = 'FWD';
    if (position.toLowerCase().includes('keeper') || position.toLowerCase().includes('goalkeeper')) posAbbrev = 'GK';
    else if (position.toLowerCase().includes('midfield')) posAbbrev = 'MID';
    else if (position.toLowerCase().includes('defender') || position.toLowerCase().includes('back')) posAbbrev = 'DEF';
    else if (position.toLowerCase().includes('striker') || position.toLowerCase().includes('forward') || position.toLowerCase().includes('winger')) posAbbrev = 'ST';

    // Calculate dynamic overall rating based on player ID, position, and performance
    const calculateOvrRating = () => {
      let hash = 0;
      const str = String(playerId || name || 'player');
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) % 1000;
      }
      const baseSeed = 75 + (hash % 10); // 75 - 84 base

      const g = parseInt(goals) || 0;
      const a = parseInt(assists) || 0;
      const sh = parseInt(shots) || 0;
      const sv = parseInt(saves) || 0;

      let statBonus = 0;
      if (posAbbrev === 'GK') {
        statBonus = Math.min(13, Math.round(sv * 0.15));
      } else if (posAbbrev === 'MID') {
        statBonus = Math.min(14, Math.round(a * 0.8 + g * 0.5 + sh * 0.05));
      } else if (posAbbrev === 'DEF') {
        statBonus = Math.min(12, Math.round(g * 0.8 + a * 0.8));
      } else {
        statBonus = Math.min(14, Math.round(g * 0.6 + a * 0.4 + sh * 0.05));
      }

      return Math.min(96, Math.max(72, baseSeed + statBonus));
    };

    const ovrRating = calculateOvrRating();

    return (
      <div className="fut-card-container">
        <div className="fut-card">
          <div className="fut-card-header">
            <div className="fut-rating">
              <span>{ovrRating}</span>
              <span className="fut-position">{posAbbrev}</span>
            </div>
            <div className="fut-player-image-wrapper">
              {headshot ? (
                <img src={headshot} alt={name} className="fut-player-image" />
              ) : (
                <div style={{width:'100%', height:'100%', display:'flex', justifyContent:'center', alignItems:'center'}}>
                  <User size={100} color="rgba(255,255,255,0.5)" />
                </div>
              )}
            </div>
          </div>
          
          <div className="fut-card-body">
            <div className="fut-name">{name}</div>
            <div className="fut-divider"></div>
            <div className="fut-stats-grid">
              <div className="fut-stat-row">
                <span className="fut-stat-val">{goals}</span>
                <span className="fut-stat-label">GLS</span>
              </div>
              <div className="fut-stat-row">
                <span className="fut-stat-val">{assists}</span>
                <span className="fut-stat-label">AST</span>
              </div>
              <div className="fut-stat-row">
                <span className="fut-stat-val">{shots}</span>
                <span className="fut-stat-label">SHT</span>
              </div>
              <div className="fut-stat-row">
                <span className="fut-stat-val">{saves}</span>
                <span className="fut-stat-label">SAV</span>
              </div>
            </div>
          </div>
        </div>

        {/* Season Live Performance Stats */}
        <div className="fut-stats-block">
          <div className="fut-stats-header">
            <Trophy size={16} color="var(--accent-gold)" />
            <span>{seasonStats ? `${season} SEASON STATS` : 'CAREER PERFORMANCE'}</span>
          </div>
          <div className="fut-stats-pills">
            <div className="stat-glow-card">
              <span className="stat-glow-num">{goals}</span>
              <span className="stat-glow-label">⚽ GOALS</span>
            </div>
            <div className="stat-glow-card">
              <span className="stat-glow-num">{assists}</span>
              <span className="stat-glow-label">🎯 ASSISTS</span>
            </div>
            {posAbbrev === 'GK' ? (
              <div className="stat-glow-card">
                <span className="stat-glow-num">{saves}</span>
                <span className="stat-glow-label">🧤 SAVES</span>
              </div>
            ) : (
              <div className="stat-glow-card">
                <span className="stat-glow-num">{shots}</span>
                <span className="stat-glow-label">🚀 SHOTS</span>
              </div>
            )}
          </div>

          {/* ADD THE CHART RIGHT HERE! 👇 */}
          <div className="chart-container" style={{ width: '100%', height: 250, marginTop: '20px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Season Performance</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Goals', value: parseInt(goals || 0), color: '#3b82f6' },
                { name: 'Assists', value: parseInt(assists || 0), color: '#10b981' },
                { name: 'Shots', value: parseInt(shots || 0), color: '#f59e0b' },
                { name: 'Saves', value: parseInt(saves || 0), color: '#ef4444' }
              ]}>
                <XAxis dataKey="name" stroke="#a0aec0" />
                <Tooltip 
                  cursor={{fill: 'rgba(255, 255, 255, 0.1)'}} 
                  contentStyle={{ backgroundColor: '#1e1e24', border: 'none', borderRadius: '8px' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[
                    { name: 'Goals', color: '#3b82f6' },
                    { name: 'Assists', color: '#10b981' },
                    { name: 'Shots', color: '#f59e0b' },
                    { name: 'Saves', color: '#ef4444' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* 👆 END OF CHART */}

        </div>

      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{zIndex: 1100}}>
      <div className="modal-content fut-card-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close Profile">
          <X size={22} />
        </button>
        {renderContent()}
      </div>
    </div>
  );
}

