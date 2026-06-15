"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { LANE_COLORS } from "@/lib/constants";
import { Development, STAGE_LABELS, captionBetween } from "@/lib/simulation";

const STAGE_INTERVAL_MS = 1400;

export default function RaceDevelopment({ development }: { development: Development }) {
  const lastStage = development.snapshots.length - 1;
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) return;
    timerRef.current = setInterval(() => {
      setStage((s) => {
        if (s >= lastStage) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, STAGE_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, lastStage]);

  function togglePlay() {
    if (stage >= lastStage) setStage(0);
    setPlaying((p) => !p);
  }

  function reset() {
    setPlaying(false);
    setStage(0);
  }

  const currentSnap = development.snapshots[stage];
  const caption = stage > 0 ? captionBetween(development.snapshots[stage - 1], currentSnap) : "";

  return (
    <div>
      {/* コントロール */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={togglePlay}
          className="flex items-center gap-1 bg-emerald-500 text-white text-xs font-semibold rounded-full px-3 py-1.5"
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
          {playing ? "一時停止" : stage >= lastStage ? "もう一度再生" : "再生"}
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-1 bg-zinc-100 text-zinc-600 text-xs font-semibold rounded-full px-3 py-1.5"
        >
          <RotateCcw size={14} />
          リセット
        </button>
        <span className="text-[11px] text-zinc-400 ml-auto">{STAGE_LABELS[stage]}</span>
      </div>

      {/* ステージインジケーター */}
      <div className="flex gap-1 mb-2">
        {development.snapshots.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setPlaying(false);
              setStage(i);
            }}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= stage ? "bg-emerald-400" : "bg-zinc-200"
            }`}
            aria-label={STAGE_LABELS[i]}
          />
        ))}
      </div>

      {/* 順位表示(アニメーション付き) */}
      <div className="relative bg-emerald-50 rounded-lg p-3 border border-emerald-100 overflow-hidden">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((lane) => {
            const pos = currentSnap.indexOf(lane);
            return (
              <div
                key={lane}
                className="flex flex-col items-center transition-all duration-700 ease-in-out"
                style={{ order: pos }}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-white shadow transition-transform duration-700 ${LANE_COLORS[String(lane)].bg} ${LANE_COLORS[String(lane)].text}`}
                >
                  {lane}
                </div>
                <span className="text-[10px] text-zinc-400 mt-1">{pos + 1}位</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* キャプション */}
      <div className="text-[11px] text-emerald-700 mt-1 pl-1 min-h-[1.2em]">
        {stage === 0 ? "枠番どおりにスタート" : caption}
      </div>

      {/* 最終結果(常に表示) */}
      <div className="text-[11px] text-zinc-500 mt-2">
        想定3着まで: <span className="font-semibold text-zinc-700">{development.finalOrder.slice(0, 3).join("-")}</span>
      </div>
    </div>
  );
}
