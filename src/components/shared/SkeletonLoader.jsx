import React from 'react';

/**
 * Animated Pulse Card Skeleton
 */
export function CardSkeleton({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-card-default border border-black/5 dark:border-white/10 rounded-2xl p-4.5 space-y-3 animate-pulse"
        >
          {/* Top meta row */}
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 bg-black/5 dark:bg-white/10 rounded-full" />
            <div className="h-3 w-8 bg-black/5 dark:bg-white/10 rounded-full" />
          </div>

          {/* Title */}
          <div className="h-5 w-3/4 bg-black/10 dark:bg-white/15 rounded-md" />

          {/* Content lines */}
          <div className="space-y-1.5 pt-1">
            <div className="h-3 w-full bg-black/5 dark:bg-white/10 rounded-md" />
            <div className="h-3 w-4/5 bg-black/5 dark:bg-white/10 rounded-md" />
          </div>

          {/* Footer tags */}
          <div className="flex items-center gap-1.5 pt-2">
            <div className="h-4 w-12 bg-black/5 dark:bg-white/10 rounded-full" />
            <div className="h-4 w-16 bg-black/5 dark:bg-white/10 rounded-full" />
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Grid Skeleton Loader for Quick Notes, Projects, Checklists, Wishlist
 */
export function GridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
      <CardSkeleton count={count} />
    </div>
  );
}

/**
 * Timeline Skeleton Loader for Journal
 */
export function TimelineSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3 w-full">
      <CardSkeleton count={count} />
    </div>
  );
}

/**
 * Widget Skeleton Loader for Prompts, Heatmaps, Dashboards
 */
export function WidgetSkeleton() {
  return (
    <div className="bg-card-default border border-black/10 dark:border-white/10 rounded-2xl p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3.5 w-24 bg-black/10 dark:bg-white/15 rounded" />
        <div className="h-3.5 w-12 bg-black/5 dark:bg-white/10 rounded" />
      </div>
      <div className="h-6 w-5/6 bg-black/10 dark:bg-white/15 rounded" />
      <div className="h-4 w-1/2 bg-black/5 dark:bg-white/10 rounded" />
    </div>
  );
}

export default {
  CardSkeleton,
  GridSkeleton,
  TimelineSkeleton,
  WidgetSkeleton,
};
