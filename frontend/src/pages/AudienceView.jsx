import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import Leaderboard from '../components/app/Leaderboard';
import MatchVisualizer from '../components/app/MatchVisualizer';
import ScoreProgressChart from '../components/app/ScoreProgressChart';
import useWebSocket from "@/hooks/useWebSocket";
import TeamVisualboard from '@/components/app/TeamVisualboard';
import ZoomIntro from '@/hooks/intro'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const AudienceView = () => {
  const [tournament, setTournament] = useState({ status: 'idle' });
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchProgress, setMatchProgress] = useState(null);

  // Graph data - continuous throughout tournament
  const [graphData, setGraphData] = useState([]);
  const baseScoresRef = useRef({});
  const dataPointRef = useRef(0);

  const { elementRef, playIntro } = ZoomIntro({
    scale: 2.5,
    duration: 1.5,
    hold: 1,
    ease: "power3.inOut",
  });

  const handleWsMessage = useCallback((data) => {
    console.log('WS Message received:', data.type, data);
    switch (data.type) {
      case 'initial_state':
        setTournament(data.tournament);
        setLeaderboard(data.leaderboard || []);
        // Initialize base scores
        if (data.leaderboard) {
          data.leaderboard.forEach(team => {
            baseScoresRef.current[team.id] = team.total_score;
          });
        }
        break;

      case 'tournament_started':
        playIntro();
        // Reset graph for new tournament
        setGraphData([]);
        dataPointRef.current = 0;
        baseScoresRef.current = {};
      // fall through
      case 'showdown_started':
        setTournament(prev => ({ ...prev, status: 'running' }));
        toast.success('Tournament Started!');
        break;

      case 'match_started':
        setCurrentMatch(data.data);
        setMatchProgress(null);
        break;

      case 'match_progress':
        setMatchProgress(data.data);

        // Update graph with ALL teams scores (3-player game)
        dataPointRef.current += 1;

        setGraphData(prevData => {
          const newPoint = {
            dataPoint: dataPointRef.current,
          };

          // Set all teams to their base scores first
          Object.keys(baseScoresRef.current).forEach(teamId => {
            newPoint[teamId] = baseScoresRef.current[teamId];
          });

          // Update the playing teams with base + current match score
          // Backend sends team_a, team_b, team_c format for 3-player matches
          const teamsToUpdate = ['team_a', 'team_b', 'team_c'];

          teamsToUpdate.forEach(teamKey => {
            const teamData = data.data[teamKey];
            if (teamData && teamData.id) {
              if (baseScoresRef.current[teamData.id] === undefined) {
                baseScoresRef.current[teamData.id] = 0;
              }
              newPoint[teamData.id] = baseScoresRef.current[teamData.id] + (teamData.score || 0);
            }
          });

          // Keep last 100 data points
          const newData = [...prevData, newPoint];
          if (newData.length > 100) {
            return newData.slice(-100);
          }
          return newData;
        });
        break;

      case 'match_completed':
        setLeaderboard(data.leaderboard);
        setMatchProgress(null);
        // Update base scores from leaderboard after match
        if (data.leaderboard) {
          data.leaderboard.forEach(team => {
            baseScoresRef.current[team.id] = team.total_score;
          });
        }
        break;

      case 'tournament_finished':
      case 'showdown_finished':
        setTournament(prev => ({ ...prev, status: 'finished' }));
        setLeaderboard(data.leaderboard);
        setCurrentMatch(null);
        toast.success('Tournament Finished!');
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
        // Reset graph
        setGraphData([]);
        dataPointRef.current = 0;
        baseScoresRef.current = {};
        break;

      default:
        break;
    }
  }, [playIntro]);

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
        // Initialize base scores from leaderboard
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

  return (
    <div className="min-h-screen p-8" data-testid="audience-view">
      {/* Header */}
      <motion.header
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div >
          <h1 ref={elementRef} className="font-display text-6xl md:text-8xl font-black tracking-tighter mb-4">
            <span className="neon-green">ALGO</span>
            <span className="neon-red">WAR</span>
          </h1>
          <p className="font-mono text-muted-foreground text-lg">
            PRISONER'S DILEMMA TOURNAMENT
          </p>
        </div>
        <div className="mt-4 flex items-center justify-center gap-4">
          <span className={`px-4 py-2 font-mono text-sm rounded ${tournament.status === 'running' ? 'bg-green-500/20 text-green-400 pulse-glow' :
            tournament.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
              tournament.status === 'finished' ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-500/20 text-gray-400'
            }`} data-testid="tournament-status">
            {tournament.status?.toUpperCase()}
          </span>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Match Visualizer */}
        <motion.div
          className="lg:row-start-1 lg:col-start-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <MatchVisualizer match={currentMatch} progress={matchProgress} />
        </motion.div>

        {/* Team Visualboard */}
        <motion.div
          className='lg:row-start-2 lg:col-start-1'
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <TeamVisualboard teams={leaderboard} currentMatch={currentMatch} matchProgress={matchProgress} />
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          className="lg:row-span-2 lg:col-start-2 h-full"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Leaderboard data={leaderboard} />
        </motion.div>
      </div>

      {/* Live Score Graph - NEW SECTION */}
      <motion.div
        className="max-w-7xl mx-auto mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="cyber-card p-6">
          <ScoreProgressChart
            graphData={graphData}
            leaderboard={leaderboard}
          />
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="mt-12 text-center">
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
}
export default AudienceView;
