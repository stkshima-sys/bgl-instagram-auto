import { resolveSlot } from "../config/env.js";
import { generateCarousel } from "../carousel/generate.js";
import { postCarousel } from "../carousel/post.js";

const mode = process.argv[2];
const slot = resolveSlot(process.argv[3]);
try {
  if (mode === "generate") await generateCarousel(slot);
  else if (mode === "post") await postCarousel(slot);
  else throw new Error("usage: carousel.ts <generate|post> [noon|evening]");
} catch (e) {
  console.error(`❌ carousel ${mode} [${slot}] 失敗:`, (e as Error).message);
  process.exit(1);
}
