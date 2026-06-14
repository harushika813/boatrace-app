import React from "react";
import { LANE_COLORS, LANE_ORDER } from "@/lib/constants";

export default function LaneStripe({ animate }: { animate: boolean }) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full">
      {LANE_ORDER.map((lane, idx) => (
        <div
          key={lane}
          className={`${LANE_COLORS[lane].bg} flex-1 ${animate ? "animate-pulse" : ""}`}
          style={animate ? { animationDelay: `${idx * 0.12}s` } : undefined}
        />
      ))}
    </div>
  );
}
