import {
  XSS_PREVIEW_AUTHOR,
  XSS_PREVIEW_PAYLOAD,
} from "@/components/challenge-playground/constants";

export async function postXssPreviewPayload(challengeId: string) {
  const maxAttempts = 5;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(`/api/preview/${challengeId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: XSS_PREVIEW_AUTHOR,
          text: XSS_PREVIEW_PAYLOAD,
        }),
      });

      if (res.ok) return;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }

    await wait(300);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("XSSプレビューの自動投稿に失敗しました。");
}

export function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
