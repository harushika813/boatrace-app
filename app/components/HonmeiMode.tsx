"use client";

import React, { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import ImageUploader, { UploadedImage } from "./ImageUploader";
import ComboBox from "./ComboBox";
import MarkdownView from "./MarkdownView";
import EVTable from "./EVTable";
import RaceDevelopment from "./RaceDevelopment";
import ResultLog from "./ResultLog";
import LaneStripe from "./LaneStripe";
import { VENUE_LIST, RACE_LIST } from "@/lib/constants";
import {
  buildProbs,
  runSimulation,
  computeEVTable,
  buildRecommendation,
  formatRecommendation,
  buildDevelopment,
  shouldRecommendSkip,
  Recommendation,
  Development,
  EVRow,
} from "@/lib/simulation";
import { ExtractedData, PrevContext, LogEntry } from "@/lib/types";
import { useLocalStorage } from "@/lib/useLocalStorage";

type SimData = {
  evRows: EVRow[];
  rec: Recommendation;
  development: Development;
  skip: { skip: boolean; reason: string };
};

export default function HonmeiMode() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [venue, setVenue] = useState("");
  const [raceNo, setRaceNo] = useState("");
  const [budget, setBudget] = useState(1500);
  const [prevContext, setPrevContext] = useState<PrevContext | null>(null);
  const [logEntries, setLogEntries] = useLocalStorage<LogEntry[]>("boatrace_log", []);

  const [mode1, setMode1] = useState("");
  const [simData, setSimData] = useState<SimData | null>(null);
  const [mode2, setMode2] = useState("");

  const [loadingStep, setLoadingStep] = useState<"" | "extract" | "sim" | "judge">("");
  const [error, setError] = useState("");

  async function analyze() {
    if (images.length === 0) {
      setError("画像をアップロードしてください");
      return;
    }
    setError("");
    setMode1("");
    setMode2("");
    setSimData(null);

    if (prevContext && (prevContext.venue !== venue || prevContext.raceNo !== raceNo)) {
      setError(
        `前回(${prevContext.venue || "未指定"} ${prevContext.raceNo ? prevContext.raceNo + "R" : ""})と会場/レースが異なります。「前回」をクリアして再分析することをおすすめします。`
      );
    }

    const imagePayload = images.map((img) => ({ mediaType: img.mediaType, base64: img.base64 }));

    try {
      setLoadingStep("extract");
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: imagePayload,
          mode: "honmei",
          venue,
          raceNo,
          budget,
          prevContext,
          logEntries,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error + (data.raw_text ? `\n${data.raw_text}` : ""));
        setLoadingStep("");
        return;
      }
      const parsed: ExtractedData = data.extracted;
      setMode1(parsed.analysis_md || "");

      // シミュレーション(クライアント側、即時)
      setLoadingStep("sim");
      const odds = (parsed.odds || [null, null, null, null, null, null]).map((o) =>
        typeof o === "number" ? o : null
      );
      const probs = buildProbs(odds);
      const counts = runSimulation(probs, 50000);
      const evRows = computeEVTable(counts, 50000);
      const rec = buildRecommendation(evRows, budget);
      const skip = shouldRecommendSkip(evRows, probs);
      const topCombo = rec.picks[0] ? rec.picks[0].combo : evRows[0].combo;
      const development = buildDevelopment(topCombo);
      setSimData({ evRows, rec, development, skip });

      // ②統合判断
      setLoadingStep("judge");
      const simSummary = `## ③シミュレーション結果(5万回)\n${
        skip.skip ? `**見送り判定**: ${skip.reason}\n\n` : ""
      }上位期待値の3連単:\n${evRows
        .slice(0, 5)
        .map(
          (r) =>
            `- ${r.combo}: 確率${(r.prob * 100).toFixed(2)}% / 想定配当${r.payoutOdds.toFixed(1)}倍 / 期待値${
              r.ev >= 0 ? "+" : ""
            }${r.ev.toFixed(0)}円`
        )
        .join("\n")}\n\n推奨買い目:\n${formatRecommendation(rec)}\n\n想定展開: ${development.finalOrder
        .slice(0, 3)
        .join("-")}`;

      let judgeText = `会場: ${venue || "未指定"} ${raceNo ? raceNo + "R" : ""}\n予算: ${budget}円\n\n# ①AI判定(定性分析)\n${
        parsed.analysis_md || ""
      }\n\n${simSummary}`;
      if (logEntries.length) {
        judgeText += `\n\n# 過去の結果・調整メモ\n${logEntries.slice(-5).map((e) => `- ${e.text}`).join("\n")}`;
      }
      const judgeRes = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judgeText }),
      });
      const judgeData = await judgeRes.json();
      if (judgeData.error) {
        setError(judgeData.error);
      } else {
        setMode2(judgeData.judge_md || "");
      }

      setPrevContext({ extracted: parsed, mode1: parsed.analysis_md || "", mode2: judgeData.judge_md || "", venue, raceNo });
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setLoadingStep("");
    }
  }

  function addLog(text: string) {
    const tag = venue || raceNo ? `[${venue || "?"} ${raceNo ? raceNo + "R" : ""}] ` : "";
    const entry: LogEntry = { date: new Date().toISOString(), text: tag + text };
    setLogEntries([...logEntries, entry].slice(-30));
  }

  const loading = loadingStep !== "";
  const loadingLabels: Record<string, string> = {
    extract: "画像を分析中...",
    sim: "5万回シミュレーション中...",
    judge: "最終判断中...",
  };
  const loadingLabel = loadingLabels[loadingStep] || "";

  return (
    <div className="space-y-4">
      <ImageUploader images={images} setImages={setImages} />

      <section className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <ComboBox label="競艇場" value={venue} onChange={setVenue} options={VENUE_LIST} placeholder="例: 下関" />
          <ComboBox label="レース" value={raceNo} onChange={setRaceNo} options={RACE_LIST} placeholder="例: 12" />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-800 block mb-1">予算(円)</label>
          <input
            type="number"
            step={100}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value) || 0)}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        {prevContext && (
          <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-center justify-between">
            <span>
              前回({prevContext.venue || "未指定"} {prevContext.raceNo ? prevContext.raceNo + "R" : ""})の分析結果を引き継いでいます
            </span>
            <button onClick={() => setPrevContext(null)} className="text-emerald-500 underline shrink-0 ml-2">
              クリア
            </button>
          </div>
        )}
      </section>

      <button
        onClick={analyze}
        disabled={loading}
        className="w-full bg-emerald-500 disabled:bg-emerald-300 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-transform"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        {loading ? loadingLabel : "分析する"}
      </button>
      {loading && (
        <div>
          <LaneStripe animate />
          <p className="text-[11px] text-emerald-700 mt-1 text-center">{loadingLabel}</p>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2 whitespace-pre-wrap">{error}</div>}

      {simData?.skip.skip && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 text-sm rounded-lg px-3 py-2 font-semibold">
          ⚠ 見送り推奨(シミュレーション根拠): {simData.skip.reason}
        </div>
      )}

      {mode1 && (
        <section className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4">
          <h2 className="text-sm font-bold text-slate-800 mb-1">① AI判定(定性分析)</h2>
          <MarkdownView text={mode1} />
        </section>
      )}

      {mode2 && (
        <section className="bg-white rounded-xl shadow-sm border border-emerald-300 p-4">
          <h2 className="text-sm font-bold text-emerald-700 mb-1">② AI判定 + シミュレーション統合(最終判断)</h2>
          <MarkdownView text={mode2} />
        </section>
      )}

      {simData && (
        <section className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4">
          <h2 className="text-sm font-bold text-slate-800 mb-2">③ シミュレーションのみ(5万回・機械的)</h2>

          <h3 className="text-xs font-semibold text-zinc-600 mb-1">期待値トップ5</h3>
          <EVTable rows={simData.evRows.slice(0, 5)} />

          <h3 className="text-xs font-semibold text-zinc-600 mt-3 mb-1">推奨買い目</h3>
          <MarkdownView text={formatRecommendation(simData.rec)} />

          <h3 className="text-xs font-semibold text-zinc-600 mt-3 mb-1">
            想定展開(最高EVパターン: {simData.development.finalOrder.slice(0, 3).join("-")})
          </h3>
          <RaceDevelopment development={simData.development} />
        </section>
      )}

      <ResultLog logEntries={logEntries} onAdd={addLog} />
    </div>
  );
}
