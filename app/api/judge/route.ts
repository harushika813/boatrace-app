import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT_JUDGE } from "@/lib/prompts";

export const maxDuration = 60;

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
      max_tokens: 1200,
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
    const { judgeText } = body as { judgeText: string };
    if (!judgeText) {
      return NextResponse.json({ error: "judgeText がありません" }, { status: 400 });
    }
    const text = await callClaude(SYSTEM_PROMPT_JUDGE, [{ type: "text", text: judgeText }]);
    return NextResponse.json({ judge_md: text });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
