import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CAROUSEL_CATEGORIES } from "../config/categories.js";
import { todayJST, Slot } from "../config/env.js";
import { chatJSON, generateImage } from "../lib/openai.js";
import { selectCategory, loadStrategy } from "../planner/select.js";
import { renderCover, renderContent, renderCTA } from "./render.js";

export interface CarouselPlan {
  date: string;
  slot: Slot;
  category: string;
  title: string;
  slides: { heading: string; body: string }[];
  caption: string;
  hashtags: string[];
  coverImagePrompt: string;
  images: string[]; // media/ 配下の相対パス
}

interface AiCarousel {
  title: string;
  slides: { heading: string; body: string }[];
  caption: string;
  hashtags: string[];
  cover_image_prompt: string;
}

const SYSTEM = `あなたは18〜30歳の野球好き女性向けライフスタイルメディア「Baseball Girls LIFE」の編集長です。
球場グルメ・観戦コーデ・一人観戦・初心者ガイドなどを、女性誌のように可愛く親しみやすく届けます。
このアカウントはサービスの宣伝アカウントではありません。広告感・押し売り・宣伝臭は一切禁止。
読者が「保存したい」「友達に送りたい」と思う、役に立って共感できる内容だけを作ります。
難しい言葉を使わず、女友達に話すような自然な日本語で書いてください。
必ずJSONのみで回答してください。`;

const SLOT_HINT: Record<Slot, string> = {
  noon: "昼12時投稿。ランチタイムにサッと読めて保存したくなる実用系・リスト系が刺さる時間帯。",
  evening: "夜19時投稿。帰宅後のリラックスタイムにじっくり読まれる。共感系・あるある要素や「明日行きたくなる」内容が刺さる時間帯。",
};

export async function generateCarousel(slot: Slot): Promise<CarouselPlan> {
  const date = todayJST();
  const category = await selectCategory(CAROUSEL_CATEGORIES, "carousel");
  const strategy = loadStrategy();

  const user = `今日のフィード投稿（カルーセル）を作成してください。

# カテゴリ
${category.name}（${category.hint}）

# 投稿時間帯
${SLOT_HINT[slot]}

# 運用戦略（必ず反映）
${strategy}

# 出力ルール
- slides: 本文スライド5〜7枚（表紙とCTAは別途自動生成するので含めない）
  - heading: 20文字以内の見出し
  - body: 60〜90文字。改行(\\n)で2〜3行に分ける。絵文字1〜2個OK
- title: 表紙タイトル。15〜22文字。数字や「〇選」で保存したくなる表現
- caption: 300〜600文字。冒頭1行で共感フック→内容の要約→コメント誘導→最後は保存を促す一言。
  自然な日本語、絵文字は控えめに5個前後。広告っぽい表現・命令口調は禁止
- hashtags: 10個。#野球女子 #球場グルメ #観戦コーデ など日本語中心、大中小の規模を混ぜる
- cover_image_prompt: 表紙背景用の英語プロンプト。
  日本の球場で観戦を楽しむ20代日本人女性のリアルな写真風。文字は入れない。
  世界観: soft pastel tones (white, beige, pastel pink, light blue), feminine Japanese
  fashion magazine aesthetic, "photorealistic, natural lighting, no text" を含める

JSON形式:
{"title": "...", "slides": [{"heading": "...", "body": "..."}], "caption": "...", "hashtags": ["#..."], "cover_image_prompt": "..."}`;

  const ai = await chatJSON<AiCarousel>(SYSTEM, user);

  // 検証
  if (!ai.slides || ai.slides.length < 4) throw new Error("スライドが4枚未満です");
  if (!ai.caption.includes("保存")) {
    ai.caption = ai.caption.trimEnd() + "\n\n保存して観戦の日に見返してね🌸";
  }
  ai.hashtags = (ai.hashtags ?? []).slice(0, 10).map((h) => (h.startsWith("#") ? h : `#${h}`));

  // 画像生成: 表紙背景(AI) → 表紙/本文/CTAをレンダリング
  const dir = join("media", "carousel", `${date}_${slot}`);
  mkdirSync(dir, { recursive: true });

  const bgPath = join(dir, "bg.png");
  await generateImage(ai.cover_image_prompt, bgPath);

  const images: string[] = [];
  const total = ai.slides.length + 2;

  const coverPath = join(dir, "01_cover.jpg");
  await renderCover(bgPath, ai.title, coverPath);
  images.push(coverPath);

  for (let i = 0; i < ai.slides.length; i++) {
    const p = join(dir, `${String(i + 2).padStart(2, "0")}_slide.jpg`);
    await renderContent(i + 2, total, ai.slides[i].heading, ai.slides[i].body, p);
    images.push(p);
  }

  const ctaPath = join(dir, `${String(total).padStart(2, "0")}_cta.jpg`);
  await renderCTA(ctaPath);
  images.push(ctaPath);

  const plan: CarouselPlan = {
    date,
    slot,
    category: category.name,
    title: ai.title,
    slides: ai.slides,
    caption: ai.caption,
    hashtags: ai.hashtags,
    coverImagePrompt: ai.cover_image_prompt,
    images: images.map((p) => p.replace(/\\/g, "/")),
  };

  mkdirSync("queue/carousel", { recursive: true });
  writeFileSync(join("queue/carousel", `${date}_${slot}.json`), JSON.stringify(plan, null, 2), "utf-8");
  console.log(`✅ カルーセル生成完了 [${slot}]: ${category.name} / ${ai.title}（${images.length}枚）`);
  return plan;
}
