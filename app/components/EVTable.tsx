import React from "react";
import { EVRow } from "@/lib/simulation";

export default function EVTable({ rows }: { rows: EVRow[] }) {
  return (
    <div className="overflow-x-auto my-2 rounded-lg border border-zinc-200">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="px-2 py-1.5 text-left">3連単</th>
            <th className="px-2 py-1.5 text-right">確率</th>
            <th className="px-2 py-1.5 text-right">想定配当</th>
            <th className="px-2 py-1.5 text-right">期待値(100円)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.combo} className={i % 2 ? "bg-slate-50" : "bg-white"}>
              <td className="px-2 py-1.5 font-semibold">{r.combo}</td>
              <td className="px-2 py-1.5 text-right">{(r.prob * 100).toFixed(2)}%</td>
              <td className="px-2 py-1.5 text-right">{r.payoutOdds.toFixed(1)}倍</td>
              <td className={`px-2 py-1.5 text-right font-semibold ${r.ev >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {r.ev >= 0 ? "+" : ""}
                {r.ev.toFixed(0)}円
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
