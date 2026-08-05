import { generateStories } from "../stories/generate.js";

try {
  await generateStories();
} catch (e) {
  console.error("❌ ストーリーズ台本生成失敗:", (e as Error).message);
  process.exit(1);
}
