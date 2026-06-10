import type { DifficultyMode } from "@/lib/difficultyConfig";

export const VERIFY_LOADING_STEPS = [
  "検証中",
  "攻撃前テスト中",
  "パッチ適用中",
  "再攻撃中",
];

export const PATCH_FILE_PATH = "src/server.js";
export const XSS_PREVIEW_AUTHOR = "attacker";
export const XSS_PREVIEW_PAYLOAD = "<script>window.__pwned__=true</script>";

export const MODE_ORDER: DifficultyMode[] = ["editPreview", "editOnly"];
