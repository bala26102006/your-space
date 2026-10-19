import React, { useEffect, useRef, useState } from 'react';
import { Flame, CheckCircle, Sparkles, TrendingUp, Calendar } from 'lucide-react';
import { getTodayStr } from '../../lib/routines/routineUtils';

function fireConfetti(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const colors = ['#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#38BDF8'];
  const particles = [];
  const particleCount = 45;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: w / 2 + (Math.random() - 0.5) * 60,
      y: h / 2,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 7 - 3,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vr: (Math.random() - 0.5) * 12,
      opacity: 1,
      shape: Math.random() > 0.5 ? 'circle' : 'rect'
    });
  }

  let animationFrame;
  const startTime = Date.now();

  const animate = () => {
    const elapsed = Date.now() - startTime;
    ctx.clearRect(0, 0, w, h);

    let activeParticles = 0;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // gravity
      p.vx *= 0.98;
      p.rotation += p.vr;
      p.opacity = Math.max(0, 1 - elapsed / 1800);

      if (p.opacity > 0 && p.y < h + 20) {
        activeParticles++;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }
    });

    if (activeParticles > 0 && elapsed < 2000) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
  };

  animationFrame = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationFrame);
}

export default function TodayHero({
  completedCount = 0,
  totalCount = 0,
  bestStreak = 0,
  weekCompletionRate = 0,
  activeRoutinesCount = 0
}) {
  const canvasRef = useRef(null);
  const [hasFiredConfetti, setHasFiredConfetti] = useState(false);
  const todayStr = getTodayStr();

  // Progress calculations
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isAllDone = totalCount > 0 && completedCount === totalCount;

  // Motivating line
  const getMotivationalLine = () => {
    if (totalCount === 0) return 'Add your first routine to build calm daily momentum.';
    if (isAllDone) return 'All done, nice work. You honored all your commitments today!';
    if (percentage >= 75) return 'Almost there! Just the final touches left.';
    if (percentage >= 50) return 'Past halfway! Great rhythm and steady consistency.';
    if (percentage > 0) return 'Great start! One mindful step at a time.';
    return 'Ready for today? Start whenever you feel centered.';
  };

  // Greeting by time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  // Confetti effect: triggers ONCE per day when reaching 100%, respects prefers-reduced-motion
  useEffect(() => {
    if (!isAllDone || hasFiredConfetti) return;

    const storageKey = `confetti_fired_${todayStr}`;
    const alreadyFired = localStorage.getItem(storageKey);
    if (alreadyFired === 'true') {
      setHasFiredConfetti(true);
      return;
    }

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (!prefersReducedMotion && canvasRef.current) {
      fireConfetti(canvasRef.current);
    }

    localStorage.setItem(storageKey, 'true');
    setHasFiredConfetti(true);
  }, [isAllDone, todayStr, hasFiredConfetti]);

  // SVG Circular progress ring calculations (Size: 84px, stroke: 7px)
  const size = 84;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 border border-sky-500/20 bg-gradient-to-br from-sky-50 via-white to-sky-100/40 dark:from-sky-950/40 dark:via-bg-primary dark:to-sky-900/20 shadow-sm transition-all">
      {/* Canvas for lightweight confetti */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 w-full h-full z-20"
      />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left: Greeting + Date + Motivational Line */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300">
              <Calendar className="w-3 h-3" />
              <span>{formattedDate}</span>
            </span>
            {isAllDone && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 animate-in fade-in zoom-in-95 duration-200">
                <Sparkles className="w-3 h-3" />
                <span>You did it!</span>
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            {getGreeting()}
          </h2>

          <p className="text-sm font-medium text-text-muted leading-relaxed max-w-xl">
            {getMotivationalLine()}
          </p>

          {/* Mini Stats Row */}
          <div className="pt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-text-secondary">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/5 backdrop-blur-xs shadow-2xs">
              <Flame className={`w-3.5 h-3.5 ${bestStreak > 0 ? 'text-amber-500' : 'text-text-muted opacity-40'}`} />
              <span className="text-text-muted">Best Streak:</span>
              <span className="font-bold text-text-primary">{bestStreak} {bestStreak === 1 ? 'day' : 'days'}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/5 backdrop-blur-xs shadow-2xs">
              <TrendingUp className="w-3.5 h-3.5 text-sky-500" />
              <span className="text-text-muted">This Week:</span>
              <span className="font-bold text-text-primary">{weekCompletionRate}%</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/5 backdrop-blur-xs shadow-2xs">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-text-muted">Active:</span>
              <span className="font-bold text-text-primary">{activeRoutinesCount}</span>
            </div>
          </div>
        </div>

        {/* Right: Animated Circular Progress Ring */}
        <div className="shrink-0 flex items-center gap-5 self-center md:self-auto bg-white/80 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5 backdrop-blur-sm shadow-sm">
          <div className="relative flex items-center justify-center">
            <svg
              width={size}
              height={size}
              className="transform -rotate-90 transition-all duration-300"
              aria-label={`${completedCount} of ${totalCount} completed`}
            >
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                className="stroke-sky-200/50 dark:stroke-sky-900/40"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Progress arc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={isAllDone ? '#10B981' : '#0EA5E9'}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset,
                  transition: 'stroke-dashoffset 400ms cubic-bezier(0.4, 0, 0.2, 1), stroke 300ms ease'
                }}
              />
            </svg>

            {/* Inner Percentage */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-base font-bold text-text-primary leading-none">
                {percentage}%
              </span>
              <span className="text-[10px] text-text-muted uppercase font-semibold tracking-wider mt-0.5">
                Done
              </span>
            </div>
          </div>

          <div className="pr-1 text-left">
            <div className="text-lg font-bold text-text-primary tracking-tight">
              {completedCount} <span className="text-sm font-normal text-text-muted">/ {totalCount}</span>
            </div>
            <div className="text-xs font-medium text-text-muted">
              {isAllDone ? 'Completed' : 'Today\'s habits'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
