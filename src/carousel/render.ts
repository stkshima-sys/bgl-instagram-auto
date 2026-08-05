import sharp from "sharp";
import { existsSync } from "node:fs";

/**
 * カルーセル画像レンダリング（1080x1350）Baseball Girls LIFE版
 * - 世界観: 白・ベージュ・パステルピンク・水色 / 女性雑誌風 / カフェ風 / ナチュラル
 * - 表紙: AI生成写真の上に白パネル＋明朝体タイトル
 * - 本文: クリーム→淡ピンクのグラデーション背景
 * - CTA:  フォロー・保存誘導が主役。Draft誘導はさりげなく1行のみ
 * 日本語テキストはSVG合成で載せる（AI画像の文字化け回避）。
 * GitHub Actionsでは fonts-noto-cjk をインストールして使う（Sans/Serif両方入る）。
 * 注意: SVGテキストに絵文字を入れない（カラー絵文字フォントが無く豆腐になる）
 */

const W = 1080;
const H = 1350;
const SANS = "Noto Sans CJK JP, Noto Sans JP, sans-serif";
const SERIF = "Noto Serif CJK JP, Noto Serif JP, serif";

// Baseball Girls LIFE ブランドカラー
const PINK = "#e8a0b4";        // パステルピンク（アクセント）
const PINK_PALE = "#fbeef2";   // ごく淡いピンク（背景）
const BLUE = "#a8cfe0";        // 水色（サブアクセント）
const CREAM = "#fdfaf6";       // クリーム（背景ベース）
const BROWN = "#5f5049";       // 見出し・本文の濃色（黒より柔らかい）
const GRAY = "#9a8f88";        // 補足テキスト

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 全角基準でテキストを折り返す（1文字残りを避けるため行長を均等化） */
function wrap(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const chars = [...para];
    if (chars.length === 0) { out.push(""); continue; }
    const lineCount = Math.ceil(chars.length / maxChars);
    const perLine = Math.ceil(chars.length / lineCount);
    for (let i = 0; i < chars.length; i += perLine) {
      out.push(chars.slice(i, i + perLine).join(""));
    }
  }
  return out;
}

function tspans(lines: string[], x: number, startY: number, lineH: number): string {
  return lines
    .map((l, i) => `<tspan x="${x}" y="${startY + i * lineH}">${esc(l)}</tspan>`)
    .join("");
}

/** 表紙: AI背景写真 + 白パネル + 明朝体タイトル */
export async function renderCover(bgPath: string, title: string, outPath: string): Promise<void> {
  const titleLines = wrap(title, 10);
  const panelH = 210 + titleLines.length * 104;
  const panelY = H - panelH - 120;
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <!-- 上部ブランドピル -->
    <rect x="${W / 2 - 260}" y="70" width="520" height="76" rx="38" fill="#ffffff" opacity="0.9"/>
    <text x="${W / 2}" y="122" font-family="${SANS}" font-size="34" letter-spacing="4" fill="${PINK}" text-anchor="middle">Baseball Girls LIFE</text>
    <!-- タイトルパネル -->
    <rect x="60" y="${panelY}" width="${W - 120}" height="${panelH}" rx="28" fill="#ffffff" opacity="0.93"/>
    <rect x="${W / 2 - 40}" y="${panelY + 56}" width="80" height="6" rx="3" fill="${PINK}"/>
    <text font-family="${SERIF}" font-size="80" font-weight="bold" fill="${BROWN}" text-anchor="middle">
      ${tspans(titleLines, W / 2, panelY + 160, 104)}
    </text>
    <text x="${W / 2}" y="${panelY + panelH - 44}" font-family="${SANS}" font-size="36" fill="${PINK}" text-anchor="middle">保存して観戦の日に見返してね</text>
  </svg>`;

  const base = existsSync(bgPath)
    ? sharp(bgPath).resize(W, H, { fit: "cover" })
    : sharp({ create: { width: W, height: H, channels: 3, background: CREAM } });

  await base.composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 90 }).toFile(outPath);
}

/** 本文スライド */
export async function renderContent(
  index: number,
  total: number,
  heading: string,
  body: string,
  outPath: string,
): Promise<void> {
  const headLines = wrap(heading, 12);
  const bodyLines = body.split("\n").flatMap((p) => wrap(p, 18));
  const headY = 330;
  const bodyY = headY + headLines.length * 96 + 90;
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${CREAM}"/>
        <stop offset="1" stop-color="${PINK_PALE}"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <text x="${W / 2}" y="120" font-family="${SANS}" font-size="30" letter-spacing="6" fill="${GRAY}" text-anchor="middle">BASEBALL GIRLS LIFE</text>
    <text x="90" y="220" font-family="${SERIF}" font-size="44" font-weight="bold" fill="${PINK}">${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}</text>
    <rect x="90" y="${headY - 68}" width="12" height="${headLines.length * 96}" rx="6" fill="${PINK}"/>
    <text font-family="${SERIF}" font-size="70" font-weight="bold" fill="${BROWN}">
      ${tspans(headLines, 140, headY, 96)}
    </text>
    <text font-family="${SANS}" font-size="50" fill="#4a4a4a">
      ${tspans(bodyLines, 90, bodyY, 82)}
    </text>
    <rect x="${W / 2 - 30}" y="${H - 140}" width="60" height="5" rx="2.5" fill="${BLUE}"/>
    <text x="${W / 2}" y="${H - 76}" font-family="${SANS}" font-size="34" fill="${GRAY}" text-anchor="middle">野球女子のライフスタイルマガジン</text>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(outPath);
}

/** 最終CTAスライド（フォロー・保存が主役、Draftはさりげなく） */
export async function renderCTA(outPath: string): Promise<void> {
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${CREAM}"/>
        <stop offset="0.6" stop-color="${PINK_PALE}"/>
        <stop offset="1" stop-color="#eaf4f9"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <text x="${W / 2}" y="360" font-family="${SANS}" font-size="34" letter-spacing="6" fill="${GRAY}" text-anchor="middle">BASEBALL GIRLS LIFE</text>
    <text x="${W / 2}" y="520" font-family="${SERIF}" font-size="92" font-weight="bold" fill="${BROWN}" text-anchor="middle">野球観戦が</text>
    <text x="${W / 2}" y="650" font-family="${SERIF}" font-size="92" font-weight="bold" fill="${BROWN}" text-anchor="middle">もっと楽しくなる</text>
    <text x="${W / 2}" y="770" font-family="${SANS}" font-size="44" fill="#4a4a4a" text-anchor="middle">グルメ・コーデ・観戦のコツを毎日お届け</text>
    <rect x="${W / 2 - 330}" y="850" width="660" height="116" rx="58" fill="${PINK}"/>
    <text x="${W / 2}" y="926" font-family="${SANS}" font-size="50" font-weight="bold" fill="#ffffff" text-anchor="middle">フォロー &amp; 保存してね</text>
    <text x="${W / 2}" y="1090" font-family="${SANS}" font-size="36" fill="${GRAY}" text-anchor="middle">一緒に観戦する仲間を見つけたい子は</text>
    <text x="${W / 2}" y="1150" font-family="${SANS}" font-size="36" fill="${GRAY}" text-anchor="middle">プロフィールのリンクもチェック</text>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(outPath);
}
