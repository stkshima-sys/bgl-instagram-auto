import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { todayJST } from "../config/env.js";
import { chatJSON } from "../lib/openai.js";
import { loadStrategy } from "../planner/select.js";

/**
 * ストーリーズ台本の自動生成（投稿は手動）。
 * Instagram Graph APIはアンケート・質問・クイズ等のスタンプ付きストーリーズを
 * 投稿できないため、毎朝台本だけ生成して queue/stories/ に置き、スマホから手動投稿する。
 */

interface AiStories {
  stories: {
    time: string;      // 投稿推奨時刻 HH:mm
    type: string;      // アンケート / クイズ / 質問箱 / 試合速報 / フィード誘導 など
    text: string;      // 画面に載せる文言
    options?: string[]; // アンケート・クイズの選択肢
    note?: string;     // 運用メモ（正解、意図など）
  }[];
}

const SYSTEM = `あなたは18〜30歳の野球好き女性向けライフスタイルメディア「Baseball Girls LIFE」の
ストーリーズ担当です。フォロワーとの距離を縮め、返信・タップ・投票などのエンゲージメントを
最大化するストーリーズを毎日設計します。広告感禁止、女友達のような自然なトーン。
必ずJSONのみで回答してください。`;

export async function generateStories(): Promise<void> {
  const date = todayJST();
  const strategy = loadStrategy();

  const user = `今日1日分のストーリーズ台本（6件）を作成してください。

# 運用戦略
${strategy}

# 構成ルール
- 6件。アンケート・クイズ・質問箱・フィード投稿への誘導・夜の試合に絡めた話題 を組み合わせる
- 12:00頃と19:00頃はその日のフィード投稿への誘導を入れる（「今日の投稿見た?」的な自然な導線）
- 野球の試合がある日はナイター時間帯（18〜21時）に試合絡みの参加型ネタを入れる
- 文言は短く、スマホ画面で読みやすく。絵文字は1〜2個
- クイズには正解をnoteに書く

JSON形式:
{"stories":[{"time":"12:05","type":"フィード誘導","text":"...","options":["A","B"],"note":"..."}]}`;

  const ai = await chatJSON<AiStories>(SYSTEM, user);

  const lines: string[] = [
    `# ストーリーズ台本 ${date}`,
    "",
    "> スマホのInstagramアプリから手動で投稿してください（APIはスタンプ付きストーリーズ非対応のため）",
    "",
  ];
  for (const s of ai.stories ?? []) {
    lines.push(`## ${s.time}｜${s.type}`);
    lines.push("");
    lines.push(s.text);
    if (s.options?.length) lines.push("", `選択肢: ${s.options.join(" / ")}`);
    if (s.note) lines.push("", `メモ: ${s.note}`);
    lines.push("");
  }

  mkdirSync("queue/stories", { recursive: true });
  const path = join("queue/stories", `${date}.md`);
  writeFileSync(path, lines.join("\n"), "utf-8");
  console.log(`✅ ストーリーズ台本生成完了: ${path}（${ai.stories?.length ?? 0}件）`);
}
