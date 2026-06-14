"use client";

import React from "react";
import { LANE_COLORS } from "@/lib/constants";

function InlineText({ text }: { text: string }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-zinc-900">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

function laneCellClass(value: string): string {
  const v = value.trim();
  const c = LANE_COLORS[v];
  return c ? `${c.bg} ${c.text} font-bold text-center rounded` : "";
}

function TableBlock({ lines }: { lines: string[] }) {
  const rows = lines
    .map((l) =>
      l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim())
    )
    .filter((r) => !r.every((c) => /^:?-+:?$/.test(c)));
  if (rows.length === 0) return null;
  const [header, ...body] = rows;
  const isLaneTable = header[0] === "枠";
  return (
    <div className="overflow-x-auto my-2 rounded-lg border border-zinc-200">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-800 text-white">
            {header.map((h, i) => (
              <th key={i} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                <InlineText text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className={ri % 2 ? "bg-slate-50" : "bg-white"}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-2 py-1.5 whitespace-nowrap border-t border-zinc-100 ${
                    ci === 0 && isLaneTable ? laneCellClass(cell) : "text-zinc-700"
                  }`}
                >
                  {ci === 0 && isLaneTable ? cell : <InlineText text={cell} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Block =
  | { type: "table"; lines: string[] }
  | { type: "heading"; text: string; level: number }
  | { type: "list"; items: string[] }
  | { type: "p"; text: string };

export default function MarkdownView({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("|")) {
      const tbl: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tbl.push(lines[i]);
        i++;
      }
      blocks.push({ type: "table", lines: tbl });
      continue;
    }
    if (/^#{1,4}\s/.test(trimmed)) {
      blocks.push({
        type: "heading",
        text: trimmed.replace(/^#{1,4}\s/, ""),
        level: trimmed.match(/^#+/)![0].length,
      });
      i++;
      continue;
    }
    if (/^[-・]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-・]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-・]\s/, ""));
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }
    if (trimmed === "") {
      i++;
      continue;
    }
    const para = [lines[i]];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("|") &&
      !/^#{1,4}\s/.test(lines[i].trim()) &&
      !/^[-・]\s/.test(lines[i].trim())
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: "p", text: para.join("\n") });
  }
  return (
    <div className="space-y-1.5">
      {blocks.map((b, idx) => {
        if (b.type === "table") return <TableBlock key={idx} lines={b.lines} />;
        if (b.type === "heading") {
          const cls =
            b.level <= 1
              ? "text-base font-bold mt-3"
              : b.level === 2
              ? "text-sm font-bold mt-2"
              : "text-sm font-semibold mt-2";
          return (
            <h3 key={idx} className={`${cls} text-slate-800 border-l-4 border-emerald-500 pl-2`}>
              <InlineText text={b.text} />
            </h3>
          );
        }
        if (b.type === "list") {
          return (
            <ul key={idx} className="list-disc list-outside ml-5 space-y-0.5 text-xs text-zinc-700">
              {b.items.map((it, ii) => (
                <li key={ii}>
                  <InlineText text={it} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
            <InlineText text={b.text} />
          </p>
        );
      })}
    </div>
  );
}
