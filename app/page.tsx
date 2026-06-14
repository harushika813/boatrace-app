"use client";

import React, { useState } from "react";
import HonmeiMode from "./components/HonmeiMode";
import LongshotMode from "./components/LongshotMode";

export default function Home() {
  const [tab, setTab] = useState<"honmei" | "longshot">("honmei");

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-4 pt-5 pb-3">
        <h1 className="text-lg font-bold tracking-wide">競艇分析アシスタント</h1>
        <p className="text-xs text-slate-400 mt-1">本命モード: ①定性分析 / ②AI+シミュレーション統合 / ③シミュレーションのみ</p>

        <div className="flex mt-4 rounded-lg overflow-hidden border border-slate-700">
          <button
            onClick={() => setTab("honmei")}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              tab === "honmei" ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-300"
            }`}
          >
            本命モード
          </button>
          <button
            onClick={() => setTab("longshot")}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              tab === "longshot" ? "bg-orange-500 text-white" : "bg-slate-800 text-slate-300"
            }`}
          >
            穴狙いモード
          </button>
        </div>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto">
        {tab === "honmei" ? <HonmeiMode /> : <LongshotMode />}
      </main>
    </div>
  );
}
