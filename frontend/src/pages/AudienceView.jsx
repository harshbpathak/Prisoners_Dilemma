import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import gsap from 'gsap';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Trophy, Zap, Pause, Play, Maximize2, Minimize2 } from 'lucide-react';
import Leaderboard from '../components/app/Leaderboard';
import MatchVisualizer from '../components/app/MatchVisualizer';
import ScoreProgressChart from '../components/app/ScoreProgressChart';
import useWebSocket from "@/hooks/useWebSocket";
import TeamVisualboard from '@/components/app/TeamVisualboard';
import ZoomIntro from '@/hooks/intro';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;


// Reusable Panel Window Component
const PanelWindow = ({ title, children, id, isExpanded, onToggleExpand, className = "" }) => {
  return (
    <div
      id={id}
      className={`cyber-card relative overflow-hidden ${className}`}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/20">
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">{title}</span>
        <button
          onClick={() => onToggleExpand(id)}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          {isExpanded ? (
            <Minimize2 className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Maximize2 className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
      {/* Panel Content */}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

const AudienceView = () => {
  const [tournament, setTournament] = useState({ status: 'idle' });
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchProgress, setMatchProgress] = useState(null);
  const [expandedPanel, setExpandedPanel] = useState(null);
  
  // Graph data
  const [graphData, setGraphData] = useState([]);
  const baseScoresRef = useRef({});
  const dataPointRef = useRef(0);
  
  // Ref for match visualizer glow effect
  const matchVisualizerRef = useRef(null);

  const { elementRef, playIntro } = ZoomIntro({
    scale: 2,
    duration: 1.5,
    hold: 1,
    ease: "power3.inOut",
  });

  // Toggle panel expansion (for presenting separately)
  const handleToggleExpand = useCallback((panelId) => {
    setExpandedPanel(prev => prev === panelId ? null : panelId);
  }, []);

  // Subtle glow animation when match starts - no movement, just emphasis
  const playMatchStartAnimation = useCallback(() => {
    if (!matchVisualizerRef.current) return;
    
    gsap.timeline()
      .to(matchVisualizerRef.current, {
        boxShadow: '0 0 40px rgba(0, 255, 148, 0.4), 0 0 80px rgba(0, 255, 148, 0.2)',
        duration: 0.5,
        ease: "power2.out"
      })
      .to(matchVisualizerRef.current, {
        boxShadow: '0 0 20px rgba(0, 255, 148, 0.2)',
        duration: 0.3,
        ease: "power2.inOut"
      });
  }, []);

  // Remove glow when match ends
  const playMatchEndAnimation = useCallback(() => {
    if (!matchVisualizerRef.current) return;
    
    gsap.to(matchVisualizerRef.current, {
      boxShadow: 'none',
      duration: 0.4,
      ease: "power2.out"
    });
  }, []);

  // Pause/Resume tournament - requires admin access
  // To enable: set ADMIN_PASSWORD in localStorage or pass via URL param
  const getAdminPassword = () => {
    return localStorage.getItem('algowar_admin_password') || null;
  };

  const pauseTournament = async () => {
    const password = getAdminPassword();
    if (!password) {
      toast.error('Admin access required. Login via Admin Panel first.');
      return;
    }
    try {
      await axios.post(`${API}/tournament/pause`, {}, { 
        headers: { 'X-Admin-Password': password } 
      });
      toast.success('Tournament paused');
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Invalid admin password. Please re-login.');
      } else {
        toast.error('Failed to pause');
      }
    }
  };

  const resumeTournament = async () => {
    const password = getAdminPassword();
    if (!password) {
      toast.error('Admin access required. Login via Admin Panel first.');
      return;
    }
    try {
      await axios.post(`${API}/tournament/resume`, {}, { 
        headers: { 'X-Admin-Password': password } 
      });
      toast.success('Tournament resumed');
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Invalid admin password. Please re-login.');
      } else {
        toast.error('Failed to resume');
      }
    }
  };

  // WebSocket handler
  const handleWsMessage = useCallback((data) => {
    switch (data.type) {
      case 'initial_state':
        setTournament(data.tournament);
        setLeaderboard(data.leaderboard || []);
        if (data.leaderboard) {
          data.leaderboard.forEach(team => {
            baseScoresRef.current[team.id] = team.total_score;
          });
        }
        break;

      case 'tournament_started':
        playIntro();
        setGraphData([]);
        dataPointRef.current = 0;
        baseScoresRef.current = {};
        // fall through
      case 'showdown_started':
        setTournament(prev => ({ ...prev, status: 'running' }));
        toast.success('Tournament Started!', { icon: <Zap className="w-4 h-4" /> });
        break;

      case 'match_started':
        setCurrentMatch(data.data);
        setMatchProgress(null);
        setTimeout(() => playMatchStartAnimation(), 100);
        break;

      case 'match_progress':
        setMatchProgress(data.data);
        dataPointRef.current += 1;

        setGraphData(prevData => {
          const newPoint = { dataPoint: dataPointRef.current };
          Object.keys(baseScoresRef.current).forEach(teamId => {
            newPoint[teamId] = baseScoresRef.current[teamId];
          });

          ['team_a', 'team_b', 'team_c'].forEach(teamKey => {
            const teamData = data.data[teamKey];
            if (teamData?.id) {
              if (baseScoresRef.current[teamData.id] === undefined) {
                baseScoresRef.current[teamData.id] = 0;
              }
              newPoint[teamData.id] = baseScoresRef.current[teamData.id] + (teamData.score || 0);
            }
          });

          const newData = [...prevData, newPoint];
          return newData.length > 100 ? newData.slice(-100) : newData;
        });
        break;

      case 'match_completed':
        setLeaderboard(data.leaderboard);
        setMatchProgress(null);
        if (data.leaderboard) {
          data.leaderboard.forEach(team => {
            baseScoresRef.current[team.id] = team.total_score;
          });
        }
        setTimeout(() => playMatchEndAnimation(), 500);
        break;

      case 'tournament_finished':
      case 'showdown_finished':
        setTournament(prev => ({ ...prev, status: 'finished' }));
        setLeaderboard(data.leaderboard);
        setCurrentMatch(null);
        toast.success('Tournament Finished!', { icon: <Trophy className="w-4 h-4" /> });
        break;

      case 'tournament_paused':
        setTournament(prev => ({ ...prev, status: 'paused' }));
        break;

      case 'tournament_resumed':
        setTournament(prev => ({ ...prev, status: 'running' }));
        break;

      case 'tournament_reset':
        setTournament({ status: 'idle' });
        setLeaderboard([]);
        setCurrentMatch(null);
        setMatchProgress(null);
        setGraphData([]);
        dataPointRef.current = 0;
        baseScoresRef.current = {};
        break;

      default:
        break;
    }
  }, [playIntro, playMatchStartAnimation, playMatchEndAnimation]);

  useWebSocket(handleWsMessage);

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, lbRes] = await Promise.all([
          axios.get(`${API}/tournament/status`),
          axios.get(`${API}/leaderboard`)
        ]);
        setTournament(statusRes.data);
        setLeaderboard(lbRes.data);
        if (lbRes.data) {
          lbRes.data.forEach(team => {
            baseScoresRef.current[team.id] = team.total_score;
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Check if a panel is expanded
  const isPanelExpanded = (panelId) => expandedPanel === panelId;

  return (
    <div className="min-h-screen p-6" data-testid="audience-view">
      {/* Header */}
      <header className="text-center mb-8">
        <h1 ref={elementRef} className="font-display text-5xl md:text-7xl font-black tracking-tighter mb-2">
          <span className="glitchtitle">ALGO</span>
          <span className="glitchtitle">WAR</span>
        </h1>
        <p className="font-mono text-muted-foreground text-sm">
          PRISONER'S DILEMMA TOURNAMENT
        </p>
        
        {/* Status and Controls */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <AnimatePresence mode="wait">
            <motion.span 
              key={tournament.status}
              className={`px-4 py-2 font-mono text-sm rounded flex items-center gap-2 ${
                tournament.status === 'running' ? 'bg-green-500/20 text-green-400' :
                tournament.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                tournament.status === 'finished' ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-500/20 text-gray-400'
              }`}
              data-testid="tournament-status"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {tournament.status === 'running' && (
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              )}
              {tournament.status?.toUpperCase()}
            </motion.span>
          </AnimatePresence>

          {/* Pause/Resume Button */}
          {tournament.status === 'running' && (
            <motion.button
              onClick={pauseTournament}
              className="cyber-btn px-4 py-2 flex items-center gap-2 text-sm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Pause className="w-4 h-4" />
              PAUSE
            </motion.button>
          )}
          {tournament.status === 'paused' && (
            <motion.button
              onClick={resumeTournament}
              className="cyber-btn px-4 py-2 flex items-center gap-2 text-sm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play className="w-4 h-4" />
              RESUME
            </motion.button>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <div className={`max-w-7xl mx-auto ${expandedPanel ? 'hidden' : ''}`}>
        
        {/* Match Visualizer - Full Width on top */}
        <div ref={matchVisualizerRef} className="mb-6 transition-shadow duration-300">
          <PanelWindow
            title="Match Visualizer"
            id="match-visualizer"
            isExpanded={isPanelExpanded('match-visualizer')}
            onToggleExpand={handleToggleExpand}
          >
            <MatchVisualizer match={currentMatch} progress={matchProgress} />
          </PanelWindow>
        </div>

        {/* Team Visualboard and Leaderboard - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <PanelWindow
            title="Team Visualboard"
            id="team-visualboard"
            isExpanded={isPanelExpanded('team-visualboard')}
            onToggleExpand={handleToggleExpand}
          >
            <TeamVisualboard teams={leaderboard} currentMatch={currentMatch} matchProgress={matchProgress} />
          </PanelWindow>

          <PanelWindow
            title="Leaderboard"
            id="leaderboard"
            isExpanded={isPanelExpanded('leaderboard')}
            onToggleExpand={handleToggleExpand}
          >
            <Leaderboard data={leaderboard} />
          </PanelWindow>
        </div>

        {/* Score Graph - Full Width */}
        <PanelWindow
          title="Live Score Graph"
          id="score-graph"
          isExpanded={isPanelExpanded('score-graph')}
          onToggleExpand={handleToggleExpand}
        >
          <ScoreProgressChart graphData={graphData} leaderboard={leaderboard} />
        </PanelWindow>
      </div>

      {/* Expanded Panel View */}
      <AnimatePresence>
        {expandedPanel && (
          <motion.div
            className="fixed inset-0 z-40 bg-background p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="max-w-6xl mx-auto h-full">
              {expandedPanel === 'match-visualizer' && (
                <PanelWindow
                  title="Match Visualizer"
                  id="match-visualizer"
                  isExpanded={true}
                  onToggleExpand={handleToggleExpand}
                  className="h-full"
                >
                  <MatchVisualizer match={currentMatch} progress={matchProgress} />
                </PanelWindow>
              )}
              {expandedPanel === 'leaderboard' && (
                <PanelWindow
                  title="Leaderboard"
                  id="leaderboard"
                  isExpanded={true}
                  onToggleExpand={handleToggleExpand}
                  className="h-full"
                >
                  <Leaderboard data={leaderboard} />
                </PanelWindow>
              )}
              {expandedPanel === 'team-visualboard' && (
                <PanelWindow
                  title="Team Visualboard"
                  id="team-visualboard"
                  isExpanded={true}
                  onToggleExpand={handleToggleExpand}
                  className="h-full"
                >
                  <TeamVisualboard teams={leaderboard} currentMatch={currentMatch} matchProgress={matchProgress} />
                </PanelWindow>
              )}
              {expandedPanel === 'score-graph' && (
                <PanelWindow
                  title="Live Score Graph"
                  id="score-graph"
                  isExpanded={true}
                  onToggleExpand={handleToggleExpand}
                  className="h-full"
                >
                  <ScoreProgressChart graphData={graphData} leaderboard={leaderboard} />
                </PanelWindow>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-8 text-center relative z-10">
        <a
          href="/admin"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-mono text-sm"
        >
          <Lock className="w-4 h-4" />
          ADMIN PANEL
        </a>
      </footer>
    </div>
  );
};

export default AudienceView;
