/**
 * トークン交換＋GitHub Secrets自動設定スクリプト。
 *
 * 使い方:
 *   1. このフォルダの token_input.txt に必要な値を貼る
 *   2. node scripts/setup-secrets.mjs を実行
 *
 * やること:
 *   - 短期トークン → 長期トークン(約60日)に交換
 *   - Facebookページ一覧から Baseball Girls LIFE を探し、IGビジネスアカウントIDを取得
 *   - gh CLI で GitHub Secrets に設定(トークンの中身は画面に表示しない)
 *   - 終了後、token_input.txt を自動削除
 */
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";

const REPO = "stkshima-sys/bgl-instagram-auto";
const V = "v25.0";
const INPUT = "token_input.txt";

if (!existsSync(INPUT)) {
  console.error(`❌ ${INPUT} がありません。テンプレートに値を記入してから実行してください。`);
  process.exit(1);
}
const raw = readFileSync(INPUT, "utf-8");
const get = (k) => {
  const m = raw.match(new RegExp(`^\\s*${k}\\s*=\\s*(.+)$`, "m"));
  const v = m ? m[1].trim() : "";
  return v.startsWith("<") ? "" : v; // プレースホルダ未記入は空扱い
};

const appId = get("APP_ID");
const appSecret = get("APP_SECRET");
const shortToken = get("SHORT_TOKEN");
if (!appId || !appSecret || !shortToken) {
  console.error("❌ APP_ID / APP_SECRET / SHORT_TOKEN のどれかが未記入です。token_input.txt を確認してください。");
  process.exit(1);
}

const mask = (s) => (s.length > 12 ? `${s.slice(0, 8)}…(${s.length}文字)` : "***");

async function graphGet(path, params) {
  const url = new URL(`https://graph.facebook.com/${V}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) {
    throw new Error(`Graph APIエラー (${path}): ${json.error.message} [code=${json.error.code}]`);
  }
  return json;
}

function setSecret(name, value) {
  execFileSync("gh", ["secret", "set", name, "--repo", REPO, "--body", value], { stdio: ["ignore", "inherit", "inherit"] });
  console.log(`   🔐 Secret設定完了: ${name}`);
}

try {
  // 1. 長期トークンに交換
  console.log("① 短期トークンを長期トークンに交換中…");
  const ex = await graphGet("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  });
  const longToken = ex.access_token;
  const days = ex.expires_in ? Math.round(ex.expires_in / 86400) : "約60";
  console.log(`   ✅ 長期トークン取得: ${mask(longToken)}（有効期間 ${days}日）`);

  // 2. ページ一覧からBGLページを探す
  console.log("② Facebookページを検索中…");
  const acc = await graphGet("me/accounts", { access_token: longToken, fields: "id,name" });
  const pages = acc.data ?? [];
  if (pages.length === 0) throw new Error("ページが1件も取得できません。トークン発行時にページを選択したか確認してください。");
  console.log(`   取得したページ: ${pages.map((p) => p.name).join(" / ")}`);
  const page = pages.find((p) => /baseball\s*girls\s*life/i.test(p.name)) ?? null;
  if (!page) throw new Error("「Baseball Girls LIFE」ページが見つかりません。トークン発行時にBGLページを選択したか確認してください。");
  console.log(`   ✅ ページ確定: ${page.name} (ID: ${page.id})`);

  // 3. IGビジネスアカウントID取得
  console.log("③ Instagramビジネスアカウントを確認中…");
  const ig = await graphGet(page.id, { access_token: longToken, fields: "instagram_business_account" });
  const igId = ig.instagram_business_account?.id;
  if (!igId) throw new Error("ページにInstagramアカウントが連携されていません。連携手順(ビジネスツールと管理→Facebookページをリンク)を確認してください。");
  console.log(`   ✅ IGビジネスアカウントID: ${igId}`);

  // 4. GitHub Secretsに設定
  console.log("④ GitHub Secretsに設定中…");
  setSecret("INSTAGRAM_ACCESS_TOKEN", longToken);
  setSecret("INSTAGRAM_BUSINESS_ACCOUNT_ID", igId);

  // 任意項目（記入されていれば一緒に設定）
  const openai = get("OPENAI_API_KEY");
  if (openai) setSecret("OPENAI_API_KEY", openai);
  const sheetsId = get("GOOGLE_SHEETS_ID");
  if (sheetsId) setSecret("GOOGLE_SHEETS_ID", sheetsId);
  const saPath = get("SERVICE_ACCOUNT_JSON_PATH");
  if (saPath) {
    if (!existsSync(saPath)) throw new Error(`サービスアカウントJSONが見つかりません: ${saPath}`);
    setSecret("GOOGLE_SERVICE_ACCOUNT_JSON", readFileSync(saPath, "utf-8"));
  }

  console.log("\n🎉 すべて完了しました。");
  const remaining = [];
  if (!openai) remaining.push("OPENAI_API_KEY");
  if (!sheetsId) remaining.push("GOOGLE_SHEETS_ID");
  if (!saPath) remaining.push("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (remaining.length) {
    console.log(`⚠ 未設定のSecrets: ${remaining.join(", ")}`);
    console.log("  token_input.txt に追記して再実行するか、GitHubの画面から手動で設定してください。");
  }
  console.log(`📅 トークン有効期限: 約${days}日後。毎月1回の再発行を忘れずに（このスクリプトを再実行すればOK）`);
} finally {
  // 機密ファイルを削除
  try { unlinkSync(INPUT); console.log(`🧹 ${INPUT} を削除しました（機密のため）`); } catch { /* 無視 */ }
}
