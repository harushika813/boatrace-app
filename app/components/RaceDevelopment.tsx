import React from "react";
import { LANE_COLORS } from "@/lib/constants";
import { Development, STAGE_LABELS, captionBetween } from "@/lib/simulation";

export default function RaceDevelopment({ development }: { development: Development }) {
  return (
    <div>
      {development.snapshots.map((snap, idx) => (
        <div key={idx} className="mb-2">
          <div className="text-[11px] text-zinc-500 mb-1">{STAGE_LABELS[idx]}</div>
          <div className="flex gap-1.5 bg-emerald-50 rounded-lg p-2 border border-emerald-100">
            {snap.map((lane, pos) => (
              <div key={lane} className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white shadow ${LANE_COLORS[String(lane)].bg} ${LANE_COLORS[String(lane)].text}`}
                >
                  {lane}
                </div>
                <span className="text-[10px] text-zinc-400 mt-0.5">{pos + 1}位</span>
              </div>
            ))}
          </div>
          {idx > 0 && (
            <div className="text-[11px] text-emerald-700 mt-1 pl-1">
              {captionBetween(development.snapshots[idx - 1], snap)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
