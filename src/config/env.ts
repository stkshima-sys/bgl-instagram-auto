import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`環境変数 ${name} が設定されていません`);
  return v;
}

export const env = {
  openaiApiKey: required("OPENAI_API_KEY"),
  igAccessToken: required("INSTAGRAM_ACCESS_TOKEN"),
  igBusinessAccountId: required("INSTAGRAM_BUSINESS_ACCOUNT_ID"),
  facebookPageId: process.env.FACEBOOK_PAGE_ID ?? "",
  sheetsId: required("GOOGLE_SHEETS_ID"),
  serviceAccountJson: required("GOOGLE_SERVICE_ACCOUNT_JSON"),
  mediaBaseUrl: required("MEDIA_BASE_URL").replace(/\/$/, ""),
  replicateToken: process.env.REPLICATE_API_TOKEN ?? "",
  replicateVideoModel: process.env.REPLICATE_VIDEO_MODEL ?? "kwaivgi/kling-v2.1",
  draftUrl: process.env.DRAFT_URL ?? "https://draft-match.com/?utm_source=instagram&utm_medium=bgl",
};

// Instagramログイン方式（Facebookページ不要）。graph.facebook.com ではなく graph.instagram.com を使う
export const GRAPH_API = "https://graph.instagram.com/v23.0";

/** JSTの今日の日付 YYYY-MM-DD */
export function todayJST(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** JSTの現在時刻 HH:mm */
export function nowJST(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(11, 16);
}

/** フィード投稿スロット（1日2回投稿するため） */
export type Slot = "noon" | "evening";

/** 引数指定がなければJST時刻から自動判定（15時より前=noon） */
export function resolveSlot(arg?: string): Slot {
  if (arg === "noon" || arg === "evening") return arg;
  return Number(nowJST().slice(0, 2)) < 15 ? "noon" : "evening";
}
