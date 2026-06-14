"use client";

import React, { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import ImageUploader, { UploadedImage } from "./ImageUploader";
import ComboBox from "./ComboBox";
import MarkdownView from "./MarkdownView";
import LaneStripe from "./LaneStripe";
import { VENUE_LIST, RACE_LIST } from "@/lib/constants";
import { LogEntry } from "@/lib/types";
import { useLocalStorage } from "@/lib/useLocalStorage";

export default function LongshotMode() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [venue, setVenue] = useState("");
  const [raceNo, setRaceNo] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [logEntries] = useLocalStorage<LogEntry[]>("boatrace_log", []);

  async function analyze() {
    if (images.length === 0) {
      setError("画像をアップロードしてください");
      return;
    }
    setError("");
    setAnalysis("");
    setLoading(true);

    const imagePayload = images.map((img) => ({ mediaType: img.mediaType, base64: img.base64 }));

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: imagePayload,
          mode: "longshot",
          venue,
          raceNo,
          logEntries,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setAnalysis(data.analysis_md || "");
      }
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <ImageUploader images={images} setImages={setImages} />

      <section className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <ComboBox label="競艇場" value={venue} onChange={setVenue} options={VENUE_LIST} placeholder="例: 下関" />
          <ComboBox label="レース" value={raceNo} onChange={setRaceNo} options={RACE_LIST} placeholder="例: 12" />
        </div>
        <p className="text-xs text-zinc-500">
          穴狙いモードは「市場が過小評価している艇・組み合わせ」を探す分析です。本命予想は本命モードをご利用ください。
        </p>
      </section>

      <button
        onClick={analyze}
        disabled={loading}
        className="w-full bg-orange-500 disabled:bg-orange-300 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-transform"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        {loading ? "分析中..." : "穴を分析する"}
      </button>
      {loading && <LaneStripe animate />}

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2 whitespace-pre-wrap">{error}</div>}

      {analysis && (
        <section className="bg-white rounded-xl shadow-sm border border-orange-300 p-4">
          <h2 className="text-sm font-bold text-orange-700 mb-1">穴狙い分析</h2>
          <MarkdownView text={analysis} />
        </section>
      )}
    </div>
  );
}
