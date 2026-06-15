import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT_EXTRACT, SYSTEM_PROMPT_LONGSHOT } from "@/lib/prompts";

export const maxDuration = 60;

type ImageInput = { mediaType: string; base64: string };

function stripJsonFence(text: string): string {
  let t = text.trim();
  t = t.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  return t.trim();
}

async function callClaude(system: string, content: unknown[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が設定されていません");
  }
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system,
      messages: [{ role: "user", content }],
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${errText}`);
  }
  const data = await response.json();
  return (data.content || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images, mode, venue, raceNo, budget, prevContext, logEntries } = body as {
      images: ImageInput[];
      mode: "honmei" | "longshot";
      venue?: string;
      raceNo?: string;
      budget?: number;
      prevContext?: { extracted: unknown; mode1: string; mode2: string; venue?: string; raceNo?: string } | null;
      logEntries?: { date: string; text: string }[];
    };

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "画像がありません" }, { status: 400 });
    }

    const contentBlocks: unknown[] = images.map((img) => ({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.base64 },
    }));

    let instruction = `会場: ${venue || "未指定"} ${raceNo ? raceNo + "R" : ""}\n予算: ${budget || 1500}円(${Math.max(
      1,
      Math.round((budget || 1500) / 100)
    )}点まで)`;

    if (mode === "honmei" && prevContext) {
      instruction += `\n\n# 前回のデータ・分析(JSON)\n${JSON.stringify({
        data: prevContext.extracted,
        mode1: prevContext.mode1,
        mode2: prevContext.mode2,
      })}`;
    }
    if (logEntries && logEntries.length) {
      instruction += `\n\n# 過去の結果・調整メモ\n${logEntries
        .slice(-5)
        .map((e) => `- ${e.text}`)
        .join("\n")}`;
    }

    contentBlocks.push({ type: "text", text: instruction });

    if (mode === "longshot") {
      const text = await callClaude(SYSTEM_PROMPT_LONGSHOT, contentBlocks);
      return NextResponse.json({ analysis_md: text });
    }

    // honmei mode: extract numeric data + mode1 analysis
    const raw = await callClaude(SYSTEM_PROMPT_EXTRACT, contentBlocks);
    let parsed;
    try {
      parsed = JSON.parse(stripJsonFence(raw));
    } catch {
      // JSONが途中で切れた場合のフォールバック: 可能な範囲でodds/analysis_mdを救出する
      const cleaned = stripJsonFence(raw);
      const oddsMatch = cleaned.match(/"odds"\s*:\s*(\[[^\]]*\])/);
      const mdMatch = cleaned.match(/"analysis_md"\s*:\s*"([\s\S]*)/);
      let odds = null;
      if (oddsMatch) {
        try {
          odds = JSON.parse(oddsMatch[1]);
        } catch {
          odds = null;
        }
      }
      let analysisMd = "";
      if (mdMatch) {
        analysisMd = mdMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/"\s*,?\s*\}?\s*$/, "");
      }
      if (analysisMd) {
        return NextResponse.json({
          extracted: { odds, analysis_md: analysisMd, notes: [] },
          warning: "応答が途中で切れたため、一部データが欠落している可能性があります",
        });
      }
      return NextResponse.json({ error: "数値データの抽出に失敗しました", raw_text: raw }, { status: 200 });
    }
    return NextResponse.json({ extracted: parsed });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
