import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Activity, Maximize2, Minimize2 } from 'lucide-react';
import MatchVisualizer from './MatchVisualizer';
import './ScoreProgressChart.css';

// Color palette for teams (esports theme)
const TEAM_COLORS = {
    team1: {
        main: '#c8ff00',
        light: '#e0ff40',
        dark: '#a8d400',
        glow: 'rgba(200, 255, 0, 0.8)',
        glowLight: 'rgba(200, 255, 0, 0.3)'
    },
    team2: {
        main: '#00ffff',
        light: '#88ffff',
        dark: '#00d4d4',
        glow: 'rgba(0, 255, 255, 0.7)',
        glowLight: 'rgba(0, 255, 255, 0.3)'
    },
    team3: {
        main: '#ff8c32',
        light: '#ffaa55',
        dark: '#e07020',
        glow: 'rgba(255, 140, 50, 0.7)',
        glowLight: 'rgba(255, 140, 50, 0.3)'
    },
    team4: {
        main: '#ff3366',
        light: '#ff6688',
        dark: '#cc2244',
        glow: 'rgba(255, 51, 102, 0.7)',
        glowLight: 'rgba(255, 51, 102, 0.3)'
    },
    team5: {
        main: '#9d4edd',
        light: '#bb77ff',
        dark: '#7b2cbf',
        glow: 'rgba(157, 78, 221, 0.7)',
        glowLight: 'rgba(157, 78, 221, 0.3)'
    },
    team6: {
        main: '#00d4aa',
        light: '#44ffcc',
        dark: '#00aa88',
        glow: 'rgba(0, 212, 170, 0.7)',
        glowLight: 'rgba(0, 212, 170, 0.3)'
    }
};

const getTeamColor = (index) => {
    const colorKeys = Object.keys(TEAM_COLORS);
    return TEAM_COLORS[colorKeys[index % colorKeys.length]];
};

const ScoreProgressChart = ({ graphData, leaderboard, currentMatch, matchProgress }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const panelRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 600, height: 320 });
    const [hoveredTeam, setHoveredTeam] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Toggle fullscreen
    const toggleFullscreen = useCallback(() => {
        if (!panelRef.current) return;

        if (!isFullscreen) {
            if (panelRef.current.requestFullscreen) {
                panelRef.current.requestFullscreen();
            } else if (panelRef.current.webkitRequestFullscreen) {
                panelRef.current.webkitRequestFullscreen();
            } else if (panelRef.current.msRequestFullscreen) {
                panelRef.current.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }, [isFullscreen]);

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(
                document.fullscreenElement === panelRef.current ||
                document.webkitFullscreenElement === panelRef.current
            );
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Update dimensions on resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({
                    width: rect.width - 70, // Account for y-axis
                    height: isFullscreen ? Math.min(window.innerHeight * 0.6, 500) : 320
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [isFullscreen]);

    // Get team info from leaderboard for colors and names
    const teamInfo = React.useMemo(() => {
        if (!leaderboard || leaderboard.length === 0) return {};
        const info = {};
        leaderboard.forEach((team, index) => {
            const colors = getTeamColor(index);
            info[team.id] = {
                name: team.name,
                colors: colors,
                index: index,
                score: team.total_score
            };
        });
        return info;
    }, [leaderboard]);

    // Get all team IDs from leaderboard
    const teamIds = React.useMemo(() => {
        if (!leaderboard || leaderboard.length === 0) return [];
        return leaderboard.map(t => t.id);
    }, [leaderboard]);

    // Calculate max score for scaling
    const maxScore = React.useMemo(() => {
        if (!graphData || graphData.length === 0) return 100;
        let max = 0;
        graphData.forEach(point => {
            teamIds.forEach(teamId => {
                if (point[teamId] > max) max = point[teamId];
            });
        });
        return Math.max(max * 1.1, 100); // Add 10% padding
    }, [graphData, teamIds]);

    // Calculate max score for bar graph (from leaderboard)
    const maxBarScore = React.useMemo(() => {
        if (!leaderboard || leaderboard.length === 0) return 100;
        const max = Math.max(...leaderboard.map(t => t.total_score || 0));
        return Math.max(max * 1.1, 100);
    }, [leaderboard]);

    // Get current round number
    const currentRound = React.useMemo(() => {
        if (!graphData || graphData.length === 0) return 0;
        return graphData.length;
    }, [graphData]);

    // Generate path for a team's line
    const generatePath = (teamId) => {
        if (!graphData || graphData.length === 0) return '';

        const padding = { left: 50, right: 20, top: 20, bottom: 40 };
        const chartWidth = dimensions.width - padding.left - padding.right;
        const chartHeight = dimensions.height - padding.top - padding.bottom;

        const points = graphData.map((point, index) => {
            const x = padding.left + (index / Math.max(graphData.length - 1, 1)) * chartWidth;
            const score = point[teamId] || 0;
            const y = padding.top + chartHeight - (score / maxScore) * chartHeight;
            return `${x},${y}`;
        });

        return points.join(' ');
    };

    // Get Y-axis labels
    const yLabels = React.useMemo(() => {
        const step = Math.ceil(maxScore / 6);
        const labels = [];
        for (let i = 6; i >= 0; i--) {
            labels.push(Math.round(i * step));
        }
        return labels;
    }, [maxScore]);

    // Generate grid lines HTML
    const gridLines = React.useMemo(() => {
        const lines = [];
        for (let i = 0; i <= 6; i++) {
            lines.push(
                <div
                    key={`h-${i}`}
                    className="esports-grid-line horizontal"
                    style={{ top: `${(i / 6) * 100}%` }}
                />
            );
        }
        for (let i = 1; i <= 4; i++) {
            lines.push(
                <div
                    key={`v-${i}`}
                    className="esports-grid-line vertical"
                    style={{ left: `${(i / 5) * 100}%` }}
                />
            );
        }
        return lines;
    }, []);

    // Get final score position for each team
    const getFinalScorePosition = (teamId) => {
        if (!graphData || graphData.length === 0) return { x: 0, y: 0 };

        const padding = { left: 50, right: 20, top: 20, bottom: 40 };
        const chartWidth = dimensions.width - padding.left - padding.right;
        const chartHeight = dimensions.height - padding.top - padding.bottom;

        const lastPoint = graphData[graphData.length - 1];
        const score = lastPoint[teamId] || 0;
        const x = padding.left + chartWidth;
        const y = padding.top + chartHeight - (score / maxScore) * chartHeight;

        return { x, y, score };
    };

    // Get leader info
    const leaderInfo = React.useMemo(() => {
        if (!leaderboard || leaderboard.length === 0) return { name: 'N/A', score: 0 };
        return {
            name: leaderboard[0].name || 'N/A',
            score: leaderboard[0].total_score || 0
        };
    }, [leaderboard]);

    if (!graphData || graphData.length === 0) {
        return (
            <div className="esports-graph-panel empty" ref={panelRef}>
                {/* Corner decorations */}
                <div className="esports-corner corner-tl"></div>
                <div className="esports-corner corner-tr"></div>
                <div className="esports-corner corner-bl"></div>
                <div className="esports-corner corner-br"></div>

                <div className="esports-header">
                    <div className="esports-header-icon">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <h1 className="esports-title">LIVE SCORE PROGRESSION</h1>
                    <div className="esports-live-indicator">
                        <div className="esports-live-dot"></div>
                        WAITING
                    </div>
                </div>

                <div className="esports-empty-state">
                    <Activity className="w-16 h-16 opacity-30 mb-4" />
                    <p className="text-lg font-display opacity-60">Graph will start when tournament begins</p>
                </div>

                {/* Show teams standings */}
                {leaderboard && leaderboard.length > 0 && (
                    <div className="esports-legend waiting-state">
                        {leaderboard.slice(0, 6).map((team, index) => {
                            const colors = getTeamColor(index);
                            return (
                                <div key={team.id} className="esports-legend-item">
                                    <div
                                        className="esports-legend-icon"
                                        style={{
                                            borderColor: colors.main,
                                            color: colors.main,
                                            boxShadow: `0 0 10px ${colors.glowLight}`
                                        }}
                                    >
                                        {index + 1}
                                    </div>
                                    <div
                                        className="esports-legend-line"
                                        style={{
                                            background: `linear-gradient(90deg, ${colors.dark}, ${colors.main})`,
                                            boxShadow: `0 0 15px ${colors.glow}`
                                        }}
                                    />
                                    <span className="esports-legend-text" style={{ color: colors.main }}>
                                        {team.name}
                                    </span>
                                    <span
                                        className="esports-legend-score"
                                        style={{
                                            color: colors.main,
                                            textShadow: `0 0 10px ${colors.glow}`
                                        }}
                                    >
                                        {team.total_score}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <motion.div
            ref={panelRef}
            className={`esports-graph-panel ${isFullscreen ? 'fullscreen' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            data-testid="score-chart"
        >
            {/* Hologram scan effect */}
            <div className="esports-hologram-scan"></div>

            {/* Energy beam effects */}
            <div className="esports-energy-beam" style={{ top: '30%' }}></div>
            <div className="esports-energy-beam" style={{ top: '60%', animationDelay: '2s' }}></div>

            {/* Corner decorations */}
            <div className="esports-corner corner-tl"></div>
            <div className="esports-corner corner-tr"></div>
            <div className="esports-corner corner-bl"></div>
            <div className="esports-corner corner-br"></div>

            {/* Ambient glow effects */}
            <div className="esports-ambient-glow cyan"></div>
            <div className="esports-ambient-glow yellow"></div>
            <div className="esports-ambient-glow orange"></div>

            {/* Header */}
            <div className="esports-header">
                <div className="esports-header-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                </div>
                <h1 className="esports-title glitch-text" data-text="LIVE SCORE PROGRESSION">
                    LIVE SCORE PROGRESSION
                </h1>
                <div className="esports-live-indicator">
                    <div className="esports-live-dot"></div>
                    LIVE
                </div>

                {/* Fullscreen Button */}
                <button
                    className="esports-fullscreen-btn"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                    {isFullscreen ? (
                        <Minimize2 className="w-5 h-5" />
                    ) : (
                        <Maximize2 className="w-5 h-5" />
                    )}
                </button>
            </div>

            {/* Main Content Grid - Line Graph + Bar Graph */}
            <div className="esports-main-grid">
                {/* Line Graph Section */}
                <div className="esports-line-graph-section">
                    {/* Graph Container */}
                    <div className="esports-graph-container" ref={containerRef}>
                        {/* Y-Axis */}
                        <div className="esports-y-axis-title">SCORE</div>
                        <div className="esports-y-axis">
                            {yLabels.map((label, index) => (
                                <div key={index} className="esports-y-label">{label}</div>
                            ))}
                        </div>

                        {/* Graph Canvas */}
                        <div className="esports-graph-canvas">
                            {/* Grid lines */}
                            <div className="esports-grid">
                                {gridLines}
                            </div>

                            {/* SVG Graph */}
                            <svg
                                ref={svgRef}
                                className="esports-graph-svg"
                                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                                preserveAspectRatio="none"
                            >
                                <defs>
                                    {/* Gradient definitions for each team */}
                                    {teamIds.map((teamId, index) => {
                                        const colors = teamInfo[teamId]?.colors || getTeamColor(index);
                                        return (
                                            <React.Fragment key={teamId}>
                                                <linearGradient id={`grad-${teamId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <stop offset="0%" style={{ stopColor: colors.dark, stopOpacity: 1 }} />
                                                    <stop offset="50%" style={{ stopColor: colors.main, stopOpacity: 1 }} />
                                                    <stop offset="100%" style={{ stopColor: colors.light, stopOpacity: 1 }} />
                                                </linearGradient>
                                                <filter id={`glow-${teamId}`} x="-50%" y="-50%" width="200%" height="200%">
                                                    <feGaussianBlur stdDeviation="3" result="blur" />
                                                    <feFlood floodColor={colors.main} floodOpacity="0.7" />
                                                    <feComposite in2="blur" operator="in" />
                                                    <feMerge>
                                                        <feMergeNode />
                                                        <feMergeNode in="SourceGraphic" />
                                                    </feMerge>
                                                </filter>
                                            </React.Fragment>
                                        );
                                    })}
                                </defs>

                                {/* Background glow traces */}
                                {teamIds.map((teamId, index) => {
                                    const colors = teamInfo[teamId]?.colors || getTeamColor(index);
                                    const path = generatePath(teamId);
                                    if (!path) return null;

                                    return (
                                        <polyline
                                            key={`glow-${teamId}`}
                                            points={path}
                                            fill="none"
                                            stroke={colors.glowLight}
                                            strokeWidth="14"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="esports-line-glow"
                                            style={{ opacity: hoveredTeam === teamId ? 0.5 : 0.15 }}
                                        />
                                    );
                                })}

                                {/* Main score lines */}
                                {teamIds.map((teamId, index) => {
                                    const colors = teamInfo[teamId]?.colors || getTeamColor(index);
                                    const path = generatePath(teamId);
                                    if (!path) return null;

                                    const isLeader = index === 0;
                                    const isHovered = hoveredTeam === teamId;

                                    return (
                                        <polyline
                                            key={`line-${teamId}`}
                                            points={path}
                                            fill="none"
                                            stroke={`url(#grad-${teamId})`}
                                            strokeWidth={isLeader ? 4 : 3}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            filter={`url(#glow-${teamId})`}
                                            className="esports-score-line"
                                            style={{
                                                strokeDasharray: 2000,
                                                strokeDashoffset: 0,
                                                opacity: hoveredTeam && !isHovered ? 0.3 : 1,
                                                transition: 'opacity 0.3s ease'
                                            }}
                                            onMouseEnter={() => setHoveredTeam(teamId)}
                                            onMouseLeave={() => setHoveredTeam(null)}
                                        />
                                    );
                                })}

                                {/* End points with pulsing effect */}
                                {teamIds.map((teamId, index) => {
                                    const { x, y } = getFinalScorePosition(teamId);
                                    const colors = teamInfo[teamId]?.colors || getTeamColor(index);
                                    const isLeader = index === 0;

                                    return (
                                        <g key={`endpoint-${teamId}`} className="esports-endpoint">
                                            <circle
                                                cx={x}
                                                cy={y}
                                                r={isLeader ? 6 : 5}
                                                fill={colors.main}
                                                className="esports-endpoint-inner"
                                            />
                                            <circle
                                                cx={x}
                                                cy={y}
                                                r={isLeader ? 12 : 10}
                                                fill="none"
                                                stroke={colors.main}
                                                strokeWidth={isLeader ? 2 : 1.5}
                                                className="esports-endpoint-outer"
                                            />
                                        </g>
                                    );
                                })}
                            </svg>

                            {/* Final score badges */}
                            {teamIds.slice(0, 3).map((teamId, index) => {
                                const { y, score } = getFinalScorePosition(teamId);
                                const colors = teamInfo[teamId]?.colors || getTeamColor(index);
                                const isLeader = index === 0;

                                return (
                                    <div
                                        key={`badge-${teamId}`}
                                        className={`esports-final-score ${isLeader ? 'leader' : ''}`}
                                        style={{
                                            top: `${y}px`,
                                            background: `linear-gradient(135deg, ${colors.glowLight}, ${colors.glowLight.replace('0.3', '0.1')})`,
                                            borderColor: colors.main,
                                            color: colors.main,
                                            boxShadow: `0 0 20px ${colors.glowLight}, 0 0 40px ${colors.glowLight.replace('0.3', '0.1')}`
                                        }}
                                    >
                                        {isLeader && <span className="crown">👑</span>}
                                        {score}
                                    </div>
                                );
                            })}
                        </div>

                        {/* X-Axis */}
                        <div className="esports-x-axis">
                            <span className="esports-x-axis-title">TIME</span>
                        </div>
                    </div>
                </div>

                {/* Bar Graph Section - Score Comparison */}
                <div className="esports-bar-graph-section">
                    <div className="esports-bar-panel">
                        {/* Bar Panel Header */}
                        <div className="esports-bar-header">
                            <h2 className="esports-bar-title">SCORE COMPARISON</h2>
                            <div className="esports-bar-round">
                                <span className="label">TIME:</span>
                                <span className="value">{currentRound}</span>
                            </div>
                        </div>

                        {/* Bar Graph Container */}
                        <div className="esports-bar-container">
                            <AnimatePresence>
                                {leaderboard && leaderboard.slice(0, 6).map((team, index) => {
                                    const colors = getTeamColor(index);
                                    const percentage = maxBarScore > 0 ? (team.total_score / maxBarScore) * 100 : 0;
                                    const isLeader = index === 0;
                                    const isHovered = hoveredTeam === team.id;

                                    return (
                                        <motion.div
                                            key={team.id}
                                            className={`esports-bar-item ${isHovered ? 'hovered' : ''}`}
                                            onMouseEnter={() => setHoveredTeam(team.id)}
                                            onMouseLeave={() => setHoveredTeam(null)}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <div className="esports-bar-label">
                                                <span
                                                    className="esports-bar-team-letter"
                                                    style={{
                                                        color: colors.main,
                                                        textShadow: `0 0 10px ${colors.glow}`
                                                    }}
                                                >
                                                    {team.name?.charAt(0) || String.fromCharCode(65 + index)}
                                                </span>
                                            </div>
                                            <div className="esports-bar-track">
                                                <motion.div
                                                    className="esports-bar-fill"
                                                    style={{
                                                        background: `linear-gradient(90deg, ${colors.dark}, ${colors.main}, ${colors.light})`,
                                                        boxShadow: `inset 0 2px 15px ${colors.glow}, 0 0 25px ${colors.glowLight}`
                                                    }}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percentage}%` }}
                                                    transition={{ duration: 1, ease: 'easeOut' }}
                                                >
                                                    {isLeader && (
                                                        <span className="esports-bar-crown">👑</span>
                                                    )}
                                                </motion.div>
                                            </div>
                                            <motion.div
                                                className="esports-bar-value"
                                                style={{
                                                    color: colors.main,
                                                    textShadow: `0 0 10px ${colors.glow}`
                                                }}
                                                key={team.total_score}
                                                initial={{ scale: 1.2 }}
                                                animate={{ scale: 1 }}
                                            >
                                                {team.total_score}
                                            </motion.div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>

                        {/* Bar Scale */}
                        <div className="esports-bar-scale">
                            <span>0</span>
                            <span>{Math.round(maxBarScore * 0.25)}</span>
                            <span>{Math.round(maxBarScore * 0.5)}</span>
                            <span>{Math.round(maxBarScore * 0.75)}</span>
                            <span>{Math.round(maxBarScore)}</span>
                        </div>

                        {/* Additional Stats */}
                        <div className="esports-bar-stats">
                            <div className="esports-bar-stat">
                                <span className="label">MAX SCORE</span>
                                <span className="value">{leaderInfo.score}</span>
                            </div>
                            <div className="esports-bar-stat leader">
                                <span className="label">LEADER</span>
                                <span className="value">{leaderInfo.name}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="esports-legend">
                {leaderboard && leaderboard.slice(0, 6).map((team, index) => {
                    const colors = getTeamColor(index);
                    const isLeader = index === 0;
                    const isHovered = hoveredTeam === team.id;

                    return (
                        <div
                            key={team.id}
                            className={`esports-legend-item ${isLeader ? 'leader' : ''} ${isHovered ? 'hovered' : ''}`}
                            onMouseEnter={() => setHoveredTeam(team.id)}
                            onMouseLeave={() => setHoveredTeam(null)}
                        >
                            <div
                                className="esports-legend-icon"
                                style={{
                                    borderColor: colors.main,
                                    color: colors.main,
                                    boxShadow: `0 0 10px ${colors.glowLight}`
                                }}
                            >
                                {index + 1}
                            </div>
                            <div
                                className="esports-legend-line"
                                style={{
                                    background: `linear-gradient(90deg, ${colors.dark}, ${colors.main})`,
                                    boxShadow: `0 0 15px ${colors.glow}`
                                }}
                            />
                            <span className="esports-legend-text" style={{ color: colors.main }}>
                                #{index + 1}{team.name?.charAt(0) || ''}
                            </span>
                            <span
                                className="esports-legend-score"
                                style={{
                                    color: colors.main,
                                    textShadow: `0 0 10px ${colors.glow}`
                                }}
                            >
                                {team.total_score}
                            </span>
                            {isLeader && <span className="esports-legend-star">★</span>}
                        </div>
                    );
                })}
            </div>

            {/* Match Visualizer - Only shown in fullscreen mode */}
            {isFullscreen && (
                <motion.div
                    className="esports-fullscreen-match-visualizer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <MatchVisualizer match={currentMatch} progress={matchProgress} slowMode={true} />
                </motion.div>
            )}

            {/* Decorative star */}
            <div className="esports-deco-star">
                <svg viewBox="0 0 24 24">
                    <polygon points="12,2 15,9 22,9 17,14 19,22 12,18 5,22 7,14 2,9 9,9" />
                </svg>
            </div>
        </motion.div>
    );
};

export default ScoreProgressChart;
