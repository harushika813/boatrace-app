"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";

export type LogEntry = { date: string; text: string };

type Props = {
  logEntries: LogEntry[];
  onAdd: (text: string) => void;
};

export default function ResultLog({ logEntries, onAdd }: Props) {
  const [newLog, setNewLog] = useState("");

  function submit() {
    if (!newLog.trim()) return;
    onAdd(newLog.trim());
    setNewLog("");
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4">
      <h2 className="text-sm font-semibold text-slate-800 mb-2">結果ログ・調整メモ</h2>
      <p className="text-xs text-zinc-500 mb-2">
        レース結果や「次はこうする」というメモを記録すると、次回以降の分析に反映されます。
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={newLog}
          onChange={(e) => setNewLog(e.target.value)}
          placeholder="例: 1-2-3的中、◉本線に厚めで正解"
          className="flex-1 border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button onClick={submit} className="bg-slate-800 text-white rounded-lg px-3 py-2">
          <Plus size={16} />
        </button>
      </div>
      {logEntries.length > 0 && (
        <ul className="mt-3 space-y-1 max-h-40 overflow-y-auto">
          {logEntries
            .slice()
            .reverse()
            .map((e, i) => (
              <li key={i} className="text-xs text-zinc-600 border-b border-zinc-100 pb-1">
                <span className="text-zinc-400 mr-1">
                  {new Date(e.date).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                </span>
                {e.text}
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
