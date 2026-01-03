import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

// Color palette for teams
const TEAM_COLORS = [
    '#00FF94', // Neon Green
    '#FF0055', // Neon Red  
    '#00F0FF', // Cyan
    '#FFD700', // Gold
    '#FF6B35', // Orange
    '#9D4EDD', // Purple
    '#00D4AA', // Teal
    '#FF1493', // Deep Pink
];

const ScoreProgressChart = ({ graphData, leaderboard }) => {
    // Get team info from leaderboard for colors and names
    const teamInfo = React.useMemo(() => {
        if (!leaderboard || leaderboard.length === 0) return {};
        const info = {};
        leaderboard.forEach((team, index) => {
            info[team.id] = {
                name: team.name,
                color: TEAM_COLORS[index % TEAM_COLORS.length],
                index: index
            };
        });
        return info;
    }, [leaderboard]);

    // Get all team IDs from leaderboard
    const teamIds = React.useMemo(() => {
        if (!leaderboard || leaderboard.length === 0) return [];
        return leaderboard.map(t => t.id);
    }, [leaderboard]);

    if (!graphData || graphData.length === 0) {
        return (
            <div className="text-center py-6" data-testid="score-chart-idle">
                <div className="text-muted-foreground font-display text-lg">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    LIVE SCORE PROGRESSION
                </div>
                <p className="text-sm text-muted-foreground mt-2 font-mono">
                    Graph will start when tournament begins
                </p>

                {/* Show teams standings */}
                {leaderboard && leaderboard.length > 0 && (
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-2">
                        {leaderboard.slice(0, 4).map((team, index) => (
                            <div
                                key={team.id}
                                className="text-center p-2 rounded bg-card/50 border border-border/50"
                            >
                                <div
                                    className="font-mono text-xs truncate"
                                    style={{ color: TEAM_COLORS[index % TEAM_COLORS.length] }}
                                >
                                    #{index + 1} {team.name}
                                </div>
                                <div
                                    className="font-display text-lg"
                                    style={{ color: TEAM_COLORS[index % TEAM_COLORS.length] }}
                                >
                                    {team.total_score}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background/95 border border-primary/30 rounded-lg p-3 shadow-lg backdrop-blur">
                    <p className="font-mono text-xs text-muted-foreground mb-2">Round {label}</p>
                    {payload
                        .sort((a, b) => (b.value || 0) - (a.value || 0))
                        .map((entry, index) => (
                            <p
                                key={index}
                                className="font-mono text-xs flex justify-between gap-4"
                                style={{ color: entry.color }}
                            >
                                <span>{entry.name}:</span>
                                <span className="font-bold">{entry.value}</span>
                            </p>
                        ))}
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            data-testid="score-chart"
        >
            <h3 className="font-display text-xl neon-cyan mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                LIVE SCORE PROGRESSION
            </h3>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={graphData}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.1)"
                        />
                        <XAxis
                            dataKey="dataPoint"
                            stroke="#888888"
                            tick={{ fill: '#888888', fontSize: 10 }}
                            tickLine={{ stroke: '#888888' }}
                        />
                        <YAxis
                            stroke="#888888"
                            tick={{ fill: '#888888', fontSize: 10 }}
                            tickLine={{ stroke: '#888888' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{
                                fontFamily: 'Orbitron, sans-serif',
                                fontSize: '11px',
                                textTransform: 'uppercase'
                            }}
                        />
                        {teamIds.map((teamId) => (
                            <Line
                                key={teamId}
                                type="monotone"
                                dataKey={teamId}
                                name={teamInfo[teamId]?.name || 'Team'}
                                stroke={teamInfo[teamId]?.color || '#888888'}
                                strokeWidth={3}
                                dot={false}
                                animationDuration={300}
                                connectNulls={true}
                                style={{
                                    filter: `drop-shadow(0 0 8px ${teamInfo[teamId]?.color || '#888888'})`
                                }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Teams standings below graph */}
            {leaderboard && leaderboard.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {leaderboard.slice(0, 4).map((team, index) => (
                        <motion.div
                            key={team.id}
                            className="text-center p-2 rounded bg-card/50 border border-border/50"
                        >
                            <div
                                className="font-mono text-xs truncate"
                                style={{ color: TEAM_COLORS[index % TEAM_COLORS.length] }}
                            >
                                #{index + 1} {team.name}
                            </div>
                            <motion.div
                                className="font-display text-lg"
                                style={{ color: TEAM_COLORS[index % TEAM_COLORS.length] }}
                                key={team.total_score}
                                initial={{ scale: 1.1 }}
                                animate={{ scale: 1 }}
                            >
                                {team.total_score}
                            </motion.div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

export default ScoreProgressChart;
