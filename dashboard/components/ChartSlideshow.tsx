"use client";

import { useCallback, useEffect, useState } from "react";

export interface ChartSlide {
  label: string;
  content: React.ReactNode;
}

interface ChartSlideshowProps {
  slides: ChartSlide[];
  className?: string;
  heightClass?: string;
}

export default function ChartSlideshow({
  slides,
  className = "",
  heightClass = "min-h-[340px]",
}: ChartSlideshowProps) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex((next + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [index, count]);

  if (count === 0) {
    return (
      <section className={`metric-card ${className}`}>
        <p className="py-12 text-center text-sm text-white/60">No charts available</p>
      </section>
    );
  }

  return (
    <section className={`metric-card ${className}`}>
      <div className="chart-slideshow-inner">
        <div className="mb-5 flex items-start justify-end gap-3">
          <nav className="flex flex-wrap justify-end gap-2" aria-label="Chart slideshow">
            {slides.map((slide, i) => (
              <button
                key={slide.label}
                type="button"
                onClick={() => setIndex(i)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  i === index
                    ? "bg-white/15 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
                aria-current={i === index ? "true" : undefined}
              >
                {slide.label}
              </button>
            ))}
          </nav>
        </div>

        <div
          className={`chart-slideshow-canvas ${heightClass} transition-opacity duration-300`}
        >
          {slides[index].content}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
            aria-label="Previous chart"
          >
            ← Prev
          </button>
          <span className="text-xs text-white/50">
            {index + 1} / {count}
          </span>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
            aria-label="Next chart"
          >
            Next →
          </button>
        </div>
      </div>
    </section>
  );
}
