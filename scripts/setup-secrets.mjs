/**
 * GitHub Secrets自動設定スクリプト（Instagramログイン方式）。
 *
 * 使い方:
 *   1. Metaアプリ管理画面の「Instagram > APIセットアップ（Instagramログイン）」で
 *      @baseballgirls_life を追加し、長期アクセストークンを生成してコピー
 *   2. token_input.txt に IG_ACCESS_TOKEN=（トークン） を書いて実行
 *
 * やること:
 *   - graph.instagram.com/me でトークンを検証し、IGユーザーID・ユーザー名を確認
 *   - gh CLI で GitHub Secrets に設定（トークンの中身は画面に表示しない）
 *   - OpenAIキー等はキャッシュ済みならまとめて設定
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";

const REPO = "stkshima-sys/bgl-instagram-auto";
const IG_GRAPH = "https://graph.instagram.com/v23.0";
const INPUT = "token_input.txt";
const CACHE = ".token_cache.json";
const EXPECTED_USERNAME = "baseballgirls_life";

// --- 入力の読み込みとキャッシュへの退避 ---
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf-8")) : {};
if (existsSync(INPUT)) {
  const raw = readFileSync(INPUT, "utf-8");
  const get = (k) => {
    const m = raw.match(new RegExp(`^\\s*${k}\\s*=\\s*(.+)$`, "m"));
    const v = m ? m[1].trim() : "";
    return v.startsWith("<") ? "" : v;
  };
  const map = {
    igToken: get("IG_ACCESS_TOKEN") || get("SHORT_TOKEN"),
    openaiKey: get("OPENAI_API_KEY"),
    sheetsId: get("GOOGLE_SHEETS_ID"),
    saPath: get("SERVICE_ACCOUNT_JSON_PATH"),
  };
  for (const [k, v] of Object.entries(map)) if (v) cache[k] = v;
  writeFileSync(CACHE, JSON.stringify(cache, null, 2), "utf-8");
  unlinkSync(INPUT);
  console.log(`🧹 ${INPUT} の値をキャッシュに退避して削除しました`);
}

if (!cache.igToken) {
  console.error("❌ IG_ACCESS_TOKEN がありません。token_input.txt に記入して再実行してください。");
  process.exit(1);
}

const mask = (s) => (s && s.length > 12 ? `${s.slice(0, 6)}…(${s.length}文字)` : "***");

async function igGet(path, params) {
  const url = new URL(`${IG_GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) {
    throw new Error(`APIエラー (${path}): ${json.error.message} [code=${json.error.code}]`);
  }
  return json;
}

function setSecret(name, value) {
  execFileSync("gh", ["secret", "set", name, "--repo", REPO, "--body", value], { stdio: ["ignore", "inherit", "inherit"] });
  console.log(`   🔐 Secret設定完了: ${name}`);
}

// --- 1. トークン検証とIGユーザーID取得 ---
console.log(`① トークンを検証中… ${mask(cache.igToken)}`);
const me = await igGet("me", {
  fields: "id,user_id,username,followers_count,media_count",
  access_token: cache.igToken,
});
const igId = String(me.user_id ?? me.id);
console.log(`   ✅ アカウント確認: @${me.username} (ID: ${igId}, フォロワー: ${me.followers_count ?? "?"}人)`);
if (me.username !== EXPECTED_USERNAME) {
  console.error(`❌ アカウントが @${EXPECTED_USERNAME} ではなく @${me.username} です。正しいアカウントでトークンを生成し直してください。`);
  process.exit(1);
}

// --- 2. GitHub Secrets ---
console.log("② GitHub Secretsに設定中…");
setSecret("INSTAGRAM_ACCESS_TOKEN", cache.igToken);
setSecret("INSTAGRAM_BUSINESS_ACCOUNT_ID", igId);
if (cache.openaiKey) setSecret("OPENAI_API_KEY", cache.openaiKey);
if (cache.sheetsId) setSecret("GOOGLE_SHEETS_ID", cache.sheetsId);
if (cache.saPath) {
  if (!existsSync(cache.saPath)) throw new Error(`サービスアカウントJSONが見つかりません: ${cache.saPath}`);
  setSecret("GOOGLE_SERVICE_ACCOUNT_JSON", readFileSync(cache.saPath, "utf-8"));
}

console.log("\n🎉 すべて完了しました。");
const remaining = [];
if (!cache.openaiKey) remaining.push("OPENAI_API_KEY");
if (!cache.sheetsId) remaining.push("GOOGLE_SHEETS_ID");
if (!cache.saPath) remaining.push("GOOGLE_SERVICE_ACCOUNT_JSON");
if (remaining.length) console.log(`⚠ 未設定のSecrets: ${remaining.join(", ")}（token_input.txt に追記して再実行）`);
console.log("📅 トークンは約60日で失効します。毎月1回、管理画面で再生成してこのスクリプトで更新してください");

unlinkSync(CACHE);
console.log("🧹 キャッシュを削除しました（機密のため）");
