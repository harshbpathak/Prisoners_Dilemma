import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords } from "lucide-react";
import gsap from "gsap";

const MatchVisualizer = ({ match, progress }) => {
  const teamAScoreRef = useRef(null);
  const teamBScoreRef = useRef(null);
  const teamCScoreRef = useRef(null);
  const teamAMoveRef = useRef(null);
  const teamBMoveRef = useRef(null);
  const teamCMoveRef = useRef(null);
  const progressBarRef = useRef(null);
  const prevScoresRef = useRef({ a: 0, b: 0, c: 0 });
  const prevMatchRef = useRef(null);

  // Smooth number counter animation
  const animateCounter = useCallback((element, fromValue, toValue) => {
    if (!element) return;
    gsap.killTweensOf(element); // Kill any existing tweens
    const counter = { value: fromValue };
    gsap.to(counter, {
      value: toValue,
      duration: 0.35,
      ease: "power1.out",
      onUpdate: () => {
        element.textContent = Math.round(counter.value);
      }
    });
  }, []);

  // Subtle pulse on score change
  const pulseScore = useCallback((element) => {
    if (!element) return;
    gsap.killTweensOf(element);
    gsap.fromTo(element, 
      { scale: 1.08 },
      { scale: 1, duration: 0.25, ease: "power2.out" }
    );
  }, []);

  // Reset scores when match changes
  useEffect(() => {
    if (match && match !== prevMatchRef.current) {
      prevScoresRef.current = { a: 0, b: 0, c: 0 };
      prevMatchRef.current = match;
      
      // Reset progress bar smoothly
      if (progressBarRef.current) {
        gsap.to(progressBarRef.current, {
          width: "0%",
          duration: 0.2,
          ease: "power2.out"
        });
      }
    }
  }, [match]);

  // Progress updates - smooth animations
  useEffect(() => {
    if (!progress) return;

    const currentScores = {
      a: progress.team_a?.score || 0,
      b: progress.team_b?.score || 0,
      c: progress.team_c?.score || 0
    };

    // Animate scores
    if (currentScores.a !== prevScoresRef.current.a) {
      animateCounter(teamAScoreRef.current, prevScoresRef.current.a, currentScores.a);
      pulseScore(teamAScoreRef.current);
    }
    if (currentScores.b !== prevScoresRef.current.b) {
      animateCounter(teamBScoreRef.current, prevScoresRef.current.b, currentScores.b);
      pulseScore(teamBScoreRef.current);
    }
    if (currentScores.c !== prevScoresRef.current.c) {
      animateCounter(teamCScoreRef.current, prevScoresRef.current.c, currentScores.c);
      pulseScore(teamCScoreRef.current);
    }

    prevScoresRef.current = currentScores;

    // Animate move indicators
    [
      { ref: teamAMoveRef, move: progress.team_a?.last_move },
      { ref: teamBMoveRef, move: progress.team_b?.last_move },
      { ref: teamCMoveRef, move: progress.team_c?.last_move }
    ].forEach(({ ref, move }) => {
      if (ref.current && move) {
        const color = move === 'C' ? "#00FF94" : "#FF0055";
        gsap.fromTo(ref.current,
          { scale: 0.5, opacity: 0 },
          { 
            scale: 1, 
            opacity: 1, 
            color,
            duration: 0.25, 
            ease: "back.out(2)" 
          }
        );
      }
    });

    // Progress bar
    if (progressBarRef.current) {
      const pct = ((progress.round || 0) / (progress.total_rounds || 100)) * 100;
      gsap.to(progressBarRef.current, {
        width: `${pct}%`,
        duration: 0.3,
        ease: "power2.out"
      });
    }

  }, [progress, animateCounter, pulseScore]);

  // Waiting state
  if (!match) {
    return (
      <div className="text-center py-12" data-testid="match-visualizer-idle">
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Swords className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        </motion.div>
        <span className="text-muted-foreground font-mono text-sm">
          WAITING FOR MATCH...
        </span>
      </div>
    );
  }

  // Team Card Component
  const TeamCard = ({ name, scoreRef, moveRef, score, move, coopPct }) => (
    <div className="text-center p-3 rounded-lg bg-black/20 border border-white/5">
      <h3 className="font-display text-lg md:text-xl mb-2 truncate text-white">
        {name}
      </h3>
      <div 
        ref={scoreRef}
        className="text-4xl md:text-5xl font-display font-black neon-green mb-2"
      >
        {score}
      </div>
      <div className="flex flex-col items-center gap-1">
        <span 
          ref={moveRef}
          className={`text-xl font-bold ${move === 'C' ? 'text-green-400' : 'text-red-400'}`}
        >
          {move || '?'}
        </span>
        <span className="text-xs text-muted-foreground">
          {coopPct}% Coop
        </span>
      </div>
    </div>
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={match?.match_number || 'match'}
        data-testid="match-visualizer"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Match Number */}
        <div className="text-center mb-4">
          <span className="text-muted-foreground font-mono text-xs">
            MATCH {match.match_number || progress?.match_number || '?'}
          </span>
        </div>

        {/* Three Teams */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <TeamCard
            name={progress?.team_a?.name || match.team_a}
            scoreRef={teamAScoreRef}
            moveRef={teamAMoveRef}
            score={progress?.team_a?.score || 0}
            move={progress?.team_a?.last_move}
            coopPct={progress?.a_coop_pct || 0}
          />
          <TeamCard
            name={progress?.team_b?.name || match.team_b}
            scoreRef={teamBScoreRef}
            moveRef={teamBMoveRef}
            score={progress?.team_b?.score || 0}
            move={progress?.team_b?.last_move}
            coopPct={progress?.b_coop_pct || 0}
          />
          <TeamCard
            name={progress?.team_c?.name || match.team_c}
            scoreRef={teamCScoreRef}
            moveRef={teamCMoveRef}
            score={progress?.team_c?.score || 0}
            move={progress?.team_c?.last_move}
            coopPct={progress?.c_coop_pct || 0}
          />
        </div>

        {/* VS Indicator */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 text-primary font-display text-lg">
            <Swords className="w-5 h-5" />
            <span>3-WAY BATTLE</span>
            <Swords className="w-5 h-5 transform scale-x-[-1]" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono text-muted-foreground">
            <span>ROUND {progress?.round || 0}</span>
            <span>{progress?.total_rounds || 100} TOTAL</span>
          </div>
          <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
            <div 
              ref={progressBarRef}
              className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full"
              style={{ width: "0%" }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MatchVisualizer;
