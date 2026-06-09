"use client";

import { useMemo, useState } from "react";
import { AttackPanel } from "@/components/AttackPanel";
import { CodeEditor } from "@/components/CodeEditor";
import { CodeViewer } from "@/components/CodeViewer";
import { LiveAppIframe } from "@/components/LiveAppIframe";
import { NextActionCard, type QuestUiStatus } from "@/components/NextActionCard";
import { PatchSelector } from "@/components/PatchSelector";
import { ProgressStepper } from "@/components/ProgressStepper";
import { ResultPanel } from "@/components/ResultPanel";
import { ScoreSummary } from "@/components/ScoreSummary";
import { VulnerableAppPreview } from "@/components/VulnerableAppPreview";
import { previewApplyPatch, verifyPatch } from "@/lib/api/challenges";
import type {
  Challenge,
  PreviewServerStatus,
  VerifyResult,
} from "@/lib/challengeTypes";
import {
  DIFFICULTY,
  DIFFICULTY_LABELS,
  type DifficultyMode,
} from "@/lib/difficultyConfig";
import { makePatch } from "@/lib/makePatch";
import { useToast } from "@/components/Toast";

type AttackState = "idle" | "running" | "success" | "failure";
type DefenseState = "idle" | "checking" | "success" | "failure" | "error";
type PreviewApplyState = "idle" | "applying" | "applied" | "error";

const VERIFY_LOADING_STEPS = [
  "検証中",
  "攻撃前テスト中",
  "パッチ適用中",
  "再攻撃中",
];

const PATCH_FILE_PATH = "src/server.js";
const XSS_PREVIEW_AUTHOR = "attacker";
const XSS_PREVIEW_PAYLOAD = "<script>window.__pwned__=true</script>";

const MODE_ORDER: DifficultyMode[] = ["select", "editPreview", "editOnly"];

export function ChallengePlayground({ challenge }: { challenge: Challenge }) {
  const toast = useToast();
  const [mode, setMode] = useState<DifficultyMode>("select");
  const difficulty = DIFFICULTY[mode];

  const [attackState, setAttackState] = useState<AttackState>("idle");
  const [codeReviewed, setCodeReviewed] = useState(false);
  const [defenseState, setDefenseState] = useState<DefenseState>("idle");
  const [selectedPatchId, setSelectedPatchId] = useState<string | null>(null);
  const [editorCode, setEditorCode] = useState<string>(challenge.initialCode);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [, setCompletedAt] = useState<number | null>(null);
  const [previewReloadKey, setPreviewReloadKey] = useState(0);
  const [previewReloading, setPreviewReloading] = useState(false);
  // Auto-test trigger for interactive previews (sqli-login / idor-profile):
  // bumping this re-runs the exploit attempt against the live container to
  // show that the user's fix now blocks it.
  const [previewAutoTestNonce, setPreviewAutoTestNonce] = useState(0);
  // Status badge shown on top of the preview after a successful verify.
  const [previewStatus, setPreviewStatus] =
    useState<PreviewServerStatus>("baseline");
  const [previewApplyState, setPreviewApplyState] =
    useState<PreviewApplyState>("idle");
  const [previewApplyError, setPreviewApplyError] = useState<string | null>(
    null,
  );
  const [hintsRevealed, setHintsRevealed] = useState(0);
  // Step 1 no longer auto-advances to Step 2 when the attack succeeds —
  // the user must explicitly click "次へ" so they can keep poking at the
  // live preview after the first successful exploit.
  const [step1Confirmed, setStep1Confirmed] = useState(false);

  const selectedPatch = challenge.patchOptions.find(
    (patch) => patch.id === selectedPatchId,
  );
  const hasAttacked = attackState === "success";
  const isEditorMode = difficulty.patchInput === "editor";
  const hasEditedCode = isEditorMode ? editorCode !== challenge.initialCode : false;
  const hasSelectedPatch = isEditorMode ? hasEditedCode : selectedPatchId !== null;
  const canSelectPatch = hasAttacked && codeReviewed;
  const canRetest = canSelectPatch && hasSelectedPatch;
  const uiStatus = getQuestUiStatus({
    attackState,
    codeReviewed,
    defenseState,
    hasSelectedPatch,
  });
  const currentStep = getCurrentStep(uiStatus, step1Confirmed);
  const completedSteps = getCompletedSteps({
    attackState,
    codeReviewed,
    defenseState,
    hasSelectedPatch,
  });

  const visibleHints = useMemo(() => {
    if (difficulty.hints === "all") return challenge.hints;
    if (difficulty.hints === "none") return [];
    return challenge.hints.slice(0, hintsRevealed);
  }, [challenge.hints, difficulty.hints, hintsRevealed]);

  const retestDisabledReason = !hasAttacked
    ? "攻撃テストを実行すると、検証に進めます。"
    : !codeReviewed
      ? "原因コードを確認すると、修正に進めます。"
      : !hasSelectedPatch
        ? isEditorMode
          ? "コードを編集すると検証できます。"
          : "修正案を選択すると検証できます。"
        : null;

  function resetPreviewApplyState() {
    setPreviewStatus("baseline");
    setPreviewApplyState("idle");
    setPreviewApplyError(null);
    setPreviewReloading(false);
  }

  function makeCurrentPatch() {
    return isEditorMode
      ? makePatch(PATCH_FILE_PATH, challenge.initialCode, editorCode)
      : selectedPatch?.patch;
  }

  function handleModeChange(next: DifficultyMode) {
    if (next === mode) return;
    setMode(next);
    handleResetMission();
    setEditorCode(challenge.initialCode);
    setHintsRevealed(0);
    resetPreviewApplyState();
  }

  function handleRunAttack() {
    // Marks the attack as observed (manual preview OR automated button)
    // without bumping the step counter. Score lift is idempotent.
    setAttackState("success");
    setCodeReviewed(false);
    setSelectedPatchId(null);
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
    resetPreviewApplyState();
    setScore((prev) => Math.max(prev, Math.min(difficulty.scoreCap, 25)));
  }

  function handleProceedToStep2() {
    if (attackState !== "success") return;
    setStep1Confirmed(true);
  }

  function handleConfirmCodeReviewed() {
    setCodeReviewed(true);
    setSelectedPatchId(null);
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
    resetPreviewApplyState();
  }

  function handleSelectPatch(patchId: string) {
    setSelectedPatchId(patchId);
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
    resetPreviewApplyState();
  }

  function handleEditorChange(next: string) {
    setEditorCode(next);
    resetPreviewApplyState();
    if (defenseState !== "idle") {
      setDefenseState("idle");
      setVerifyResult(null);
      setVerifyError(null);
    }
  }

  function handleTryAnotherPatch() {
    setSelectedPatchId(null);
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
    resetPreviewApplyState();
    setScore(hasAttacked ? Math.min(difficulty.scoreCap, 25) : 0);
  }

  function handleBackToEditor() {
    // Clears the result/checking state so currentStep drops back to 3 with
    // the user's last editorCode (or selectedPatchId) intact. Score is not
    // reset — only verifyResult/error and defenseState are.
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
    resetPreviewApplyState();
  }

  function handleResetMission() {
    setAttackState("idle");
    setStep1Confirmed(false);
    setCodeReviewed(false);
    setSelectedPatchId(null);
    setEditorCode(challenge.initialCode);
    setDefenseState("idle");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(null);
    setScore(0);
    setCompletedAt(null);
    resetPreviewApplyState();
    setPreviewAutoTestNonce(0);
  }

  function handleRevealHint() {
    setHintsRevealed((n) => Math.min(challenge.hints.length, n + 1));
  }

  async function postXssPreviewPayload() {
    const maxAttempts = 5;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const res = await fetch(`/api/preview/${challenge.id}/comments`, {
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

  async function refreshPreviewAfterPatch(
    nextStatus: PreviewServerStatus,
    delayMs = 0,
  ) {
    if (!difficulty.showSite) return;

    setPreviewReloading(true);
    try {
      if (delayMs > 0) {
        await wait(delayMs);
      }
      if (challenge.id === "xss-comments") {
        await postXssPreviewPayload();
      }
      setPreviewReloadKey((k) => k + 1);
      setPreviewAutoTestNonce((n) => n + 1);
      setPreviewStatus(nextStatus);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `プレビュー自動テストに失敗しました: ${err.message}`
          : "プレビュー自動テストに失敗しました",
      );
    } finally {
      setPreviewReloading(false);
    }
  }

  async function handlePreviewApply() {
    const patchString = makeCurrentPatch();

    if (!patchString) {
      return;
    }

    setPreviewApplyState("applying");
    setPreviewApplyError(null);
    setPreviewReloading(true);

    try {
      await previewApplyPatch(challenge.id, patchString);
      setPreviewApplyState("applied");
      await refreshPreviewAfterPatch("applied");
      toast.success("プレビューに反映しました");
    } catch (error) {
      setPreviewApplyState("error");
      setPreviewStatus("baseline");
      setPreviewApplyError(
        error instanceof Error ? error.message : "パッチ適用失敗",
      );
      setPreviewReloading(false);
      toast.error("パッチ適用失敗");
    }
  }

  async function handleSubmitPatch() {
    const patchString = makeCurrentPatch();

    if (!patchString) {
      return;
    }

    setDefenseState("checking");
    setVerifyResult(null);
    setVerifyError(null);
    setLoadingStep(VERIFY_LOADING_STEPS[0]);

    let stepIndex = 0;
    const loadingTimer = window.setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, VERIFY_LOADING_STEPS.length - 1);
      setLoadingStep(VERIFY_LOADING_STEPS[stepIndex]);
    }, 1400);

    try {
      const [result] = await Promise.all([
        verifyPatch(challenge.id, patchString),
        wait(1200),
      ]);

      setVerifyResult(result);
      setDefenseState(result.passed ? "success" : "failure");
      const calculated = result.passed ? 100 : 35;
      setScore(Math.min(difficulty.scoreCap, calculated));
      if (result.passed) {
        setCompletedAt(Date.now());
        toast.success("問題をクリアしました！");
        if (difficulty.showSite) {
          void refreshPreviewAfterPatch("verified", 800);
          window.setTimeout(() => {
            setPreviewStatus("reset");
          }, 15000);
        }
      } else {
        toast.error("防御失敗");
        if (difficulty.hints === "onDemand") {
          handleRevealHint();
        }
      }
    } catch (error) {
      setDefenseState("error");
      setVerifyError(
        error instanceof Error
          ? error.message
          : "パッチ検証中に不明なエラーが発生しました。",
      );
      toast.error("通信エラーが発生しました");
    } finally {
      window.clearInterval(loadingTimer);
      setLoadingStep(null);
    }
  }

  // Render the live preview only in editor modes where the difficulty
  // allows it. Inside that gate, route by problem: HTML-bearing problems
  // (xss-comments) get the iframe; JSON-only endpoints (sqli-login,
  // idor-profile) get the interactive VulnerableAppPreview, since an
  // iframe pointing at /health or a JSON response is useless.
  const showLivePreview = isEditorMode && difficulty.showSite;
  const liveViewMode = challenge.liveViewMode ?? "iframe";
  const selectedPatchTitle = isEditorMode
    ? hasEditedCode
      ? "ユーザー編集コード"
      : undefined
    : selectedPatch?.title;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <DifficultySwitcher mode={mode} onChange={handleModeChange} />

      <StickyMissionBar
        currentStep={currentStep}
        selectedPatchTitle={selectedPatchTitle}
        status={uiStatus}
      />

      <ProgressStepper
        completedSteps={completedSteps}
        currentStep={currentStep}
        step2Subtitle={challenge.stepCopy?.stepperStep2Subtitle}
      />

      <div className="relative isolate grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
        <aside className="relative z-0 flex min-w-0 flex-col gap-3 self-start">
          <NextActionCard
            attackedBody={challenge.stepCopy?.nextActionAttacked}
            codeReviewedBody={challenge.stepCopy?.nextActionCodeReviewed}
            selectedPatchTitle={selectedPatchTitle}
            status={uiStatus}
          />
          <ScoreSummary
            attackComplete={hasAttacked}
            defenseState={defenseState}
            score={score}
          />
          <ScoreCapBadge mode={mode} cap={difficulty.scoreCap} />
          {visibleHints.length > 0 ? (
            <HintsPanel
              hints={visibleHints}
              total={challenge.hints.length}
              mode={difficulty.hints}
              onReveal={difficulty.hints === "onDemand" ? handleRevealHint : undefined}
              canReveal={hintsRevealed < challenge.hints.length}
            />
          ) : difficulty.hints === "onDemand" ? (
            <button
              type="button"
              onClick={handleRevealHint}
              className="rounded border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-left text-xs font-bold text-amber-100 transition hover:bg-amber-300/20"
            >
              💡 ヒントを表示する (1/{challenge.hints.length})
            </button>
          ) : null}
          <StepSummaryList
            attackedSummary={challenge.progress?.attackedSummary}
            codeReviewed={codeReviewed}
            currentStep={currentStep}
            defenseState={defenseState}
            hasAttacked={hasAttacked}
            hasSelectedPatch={hasSelectedPatch}
            selectedPatchTitle={selectedPatchTitle}
          />
        </aside>

        <section className="relative z-0 min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-xl shadow-black/30 sm:p-5">
          {currentStep === 1 ? (
            <ActiveStepHeader
              eyebrow="Step 1"
              title="攻撃テスト"
              description={
                challenge.stepCopy?.step1Description ??
                "攻撃を実行し、脆弱性が刺さるかを確認しましょう。"
              }
            />
          ) : null}
          {currentStep === 2 ? (
            <ActiveStepHeader
              eyebrow="Step 2"
              title="原因コードを確認"
              description={
                challenge.stepCopy?.step2Description ??
                "脆弱性の原因になっている箇所を探します。確認できたら次のステップへ進みます。"
              }
            />
          ) : null}
          {currentStep === 3 ? (
            <ActiveStepHeader
              eyebrow="Step 3"
              title={isEditorMode ? "コードを修正" : "修正案を選択"}
              description={
                isEditorMode
                  ? "脆弱なコードを直接編集して、原因を取り除きましょう。"
                  : (challenge.stepCopy?.step3Description ??
                    "原因に対する修正案を選びましょう。")
              }
            />
          ) : null}
          {currentStep === 4 ? (
            <ActiveStepHeader
              eyebrow="Step 4"
              title="再テスト結果"
              description={
                challenge.stepCopy?.step4Description ??
                "選んだ修正案で脆弱性を防げるか、実際の攻撃テストで確認します。"
              }
            />
          ) : null}

          <div className="mt-4">
            {currentStep === 1 ? (
              <div className="grid min-w-0 gap-4">
                <div className="grid min-w-0 gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                  <VulnerableAppPreview
                    challenge={challenge}
                    onExploitDetected={handleRunAttack}
                  />
                  <AttackPanel
                    attackPayload={challenge.attackPayload}
                    attackState={attackState}
                    attackVerifiedMessage={
                      challenge.attackVerifiedMessage ??
                      "脆弱性が刺さる動きを確認しました"
                    }
                    disclaimer={
                      challenge.attackVerifyDisclaimer ??
                      "実際の脆弱アプリケーションに対して攻撃を実行し、防御を検証します。"
                    }
                    onRunAttack={handleRunAttack}
                  />
                </div>
                {attackState === "success" ? (
                  <ProceedToStep2
                    onProceed={handleProceedToStep2}
                  />
                ) : null}
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="grid min-w-0 gap-4">
                <CodeViewer
                  code={challenge.initialCode}
                  language="typescript"
                  title="Step 2：原因コードを確認"
                />
                <div className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-4">
                  <p className="text-sm font-bold text-amber-100">
                    {challenge.stepCopy?.focusBoxTitle ?? "見るポイント"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-200">
                    {challenge.stepCopy?.focusBoxBody ??
                      "ユーザー入力をそのまま処理に渡している箇所を探してください。"}
                  </p>
                  <button
                    type="button"
                    onClick={handleConfirmCodeReviewed}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center rounded border border-cyan-300/60 bg-cyan-300 px-4 text-sm font-black text-zinc-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-zinc-950 sm:w-auto"
                  >
                    原因コードを確認した
                  </button>
                </div>
                <HintPanel
                  hints={challenge.hints}
                  hintsRevealed={hintsRevealed}
                  onRevealHint={handleRevealHint}
                />
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="grid min-w-0 gap-4">
                {isEditorMode ? (
                  <div
                    className={
                      showLivePreview
                        ? "grid min-w-0 gap-4 xl:grid-cols-2"
                        : "grid min-w-0 gap-4"
                    }
                  >
                    <div className="flex min-w-0 flex-col gap-2">
                      <p className="text-xs leading-5 text-zinc-500">
                        脆弱な箇所を見つけて、該当行だけを修正してください。
                        コード全体を置き換えると正しく検証できません。
                      </p>
                      <CodeEditor
                        value={editorCode}
                        language="javascript"
                        onChange={handleEditorChange}
                        onReset={() => handleEditorChange(challenge.initialCode)}
                      />
                      {mode === "editPreview" ? (
                        <PreviewApplyControl
                          disabledReason={
                            !hasEditedCode
                              ? "コードを編集するとプレビューに反映できます。"
                              : previewApplyState === "applied"
                                ? "現在の編集内容は反映済みです。"
                                : null
                          }
                          error={previewApplyError}
                          state={previewApplyState}
                          onApply={handlePreviewApply}
                        />
                      ) : null}
                    </div>
                    {showLivePreview ? (
                      liveViewMode === "iframe" ? (
                        <LiveAppIframe
                          problemId={challenge.id}
                          reloadKey={previewReloadKey}
                          reloading={previewReloading}
                          previewStatus={previewStatus}
                        />
                      ) : (
                        <VulnerableAppPreview
                          challenge={challenge}
                          autoTestNonce={previewAutoTestNonce}
                          previewStatus={previewStatus}
                        />
                      )
                    ) : null}
                  </div>
                ) : (
                  <PatchSelector
                    disabled={!canSelectPatch}
                    disabledReason={
                      canSelectPatch ? null : "まず攻撃テストを実行してください。"
                    }
                    patchOptions={challenge.patchOptions}
                    selectedPatchId={selectedPatchId}
                    onSelectPatch={handleSelectPatch}
                  />
                )}

                <VerifyTrigger
                  canRetest={canRetest}
                  disabledReason={retestDisabledReason}
                  isEditorMode={isEditorMode}
                  onSubmit={handleSubmitPatch}
                />
              </div>
            ) : null}

            {currentStep === 4 ? (
              <>
                {showLivePreview ? (
                  <div className="mb-4">
                    {liveViewMode === "iframe" ? (
                      <LiveAppIframe
                        problemId={challenge.id}
                        reloadKey={previewReloadKey}
                        reloading={previewReloading}
                        previewStatus={previewStatus}
                      />
                    ) : (
                      <VulnerableAppPreview
                        challenge={challenge}
                        autoTestNonce={previewAutoTestNonce}
                        previewStatus={previewStatus}
                      />
                    )}
                  </div>
                ) : null}
                <ResultPanel
                  canRetest={canRetest}
                  challenge={challenge}
                  defenseState={defenseState}
                  disabledReason={retestDisabledReason}
                  errorMessage={verifyError}
                  isEditorMode={isEditorMode}
                  loadingStep={loadingStep}
                  onBackToEditor={handleBackToEditor}
                  onReset={handleResetMission}
                  onRetest={handleSubmitPatch}
                  onTryAnotherPatch={handleTryAnotherPatch}
                  selectedPatchTitle={selectedPatchTitle}
                  verifyResult={verifyResult}
                  onRevealHint={
                    difficulty.hints === "onDemand" &&
                    hintsRevealed < challenge.hints.length
                      ? handleRevealHint
                      : undefined
                  }
                  hintRevealLabel={`次のヒントを見る (${hintsRevealed + 1}/${challenge.hints.length})`}
                />
              </>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function DifficultySwitcher({
  mode,
  onChange,
}: {
  mode: DifficultyMode;
  onChange: (next: DifficultyMode) => void;
}) {
  return (
    <div className="rounded-lg border border-cyan-300/20 bg-zinc-900/95 p-3 shadow-xl shadow-black/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
            Difficulty
          </p>
          <p className="mt-1 text-sm leading-5 text-zinc-300">
            出題モードを選ぶと、Step 3 の修正方法とヒント・スコア上限が変わります。
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Difficulty mode"
          className="flex flex-wrap gap-2"
        >
          {MODE_ORDER.map((m) => {
            const settings = DIFFICULTY[m];
            const active = m === mode;
            return (
              <button
                key={m}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => onChange(m)}
                className={`rounded border px-3 py-2 text-left text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                  active
                    ? "border-cyan-300 bg-cyan-300/10 text-cyan-100 shadow-lg shadow-cyan-950/30"
                    : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:text-white"
                }`}
              >
                <span className="block text-sm font-black">
                  {DIFFICULTY_LABELS[m]}
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  cap {settings.scoreCap}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ScoreCapBadge({
  mode,
  cap,
}: {
  mode: DifficultyMode;
  cap: number;
}) {
  return (
    <div className="relative min-w-0 rounded border border-zinc-700 bg-black p-2.5 text-xs text-zinc-300">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
        Score Cap
      </p>
      <p className="mt-1 text-xs leading-5 text-zinc-100">
        {DIFFICULTY_LABELS[mode]} モードのスコア上限は{" "}
        <span className="font-black text-emerald-200">{cap}</span> 点です。
      </p>
    </div>
  );
}

function HintsPanel({
  hints,
  total,
  mode,
  onReveal,
  canReveal,
}: {
  hints: string[];
  total: number;
  mode: "all" | "onDemand" | "none";
  onReveal?: () => void;
  canReveal: boolean;
}) {
  return (
    <aside className="relative min-w-0 rounded border border-amber-300/30 bg-zinc-950 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-100">
          ヒント ({hints.length}/{total})
        </p>
        {mode === "onDemand" && onReveal && canReveal ? (
          <button
            type="button"
            onClick={onReveal}
            className="rounded border border-amber-300/50 bg-amber-300/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-300/20"
          >
            次を開く
          </button>
        ) : null}
      </div>
      <ul className="mt-2 grid gap-1.5">
        {hints.map((hint, i) => (
          <HintItem
            key={`${i}:${hint.slice(0, 12)}`}
            index={i}
            text={hint}
          />
        ))}
      </ul>
    </aside>
  );
}

function HintItem({ index, text }: { index: number; text: string }) {
  const [open, setOpen] = useState(false);
  const bodyId = `hint-body-${index}`;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center gap-2 rounded border border-amber-300/20 bg-black/20 px-2 py-1.5 text-left text-xs leading-5 text-zinc-200 transition hover:border-amber-300/40 hover:bg-amber-300/10"
      >
        <span
          aria-hidden
          className={`text-xs font-bold text-amber-200 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200">
          ヒント {index + 1}
        </span>
      </button>
      {open ? (
        <p id={bodyId} className="mt-1.5 px-1 text-xs leading-5 text-zinc-200">{text}</p>
      ) : null}
    </li>
  );
}

function PreviewApplyControl({
  disabledReason,
  error,
  onApply,
  state,
}: {
  disabledReason: string | null;
  error: string | null;
  onApply: () => void;
  state: PreviewApplyState;
}) {
  const applying = state === "applying";
  const applied = state === "applied";
  const disabled = applying || applied || Boolean(disabledReason);

  return (
    <div className="rounded-lg border border-emerald-300/20 bg-zinc-950 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
          Preview Apply
        </p>
        {applied ? (
          <span className="rounded border border-emerald-300/40 bg-emerald-300/10 px-2 py-1 text-xs font-bold text-emerald-100">
            ✅ 反映完了
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onApply}
        disabled={disabled}
        className="mt-3 inline-flex h-11 w-full items-center justify-center rounded border border-emerald-300/60 bg-emerald-300 px-4 text-sm font-black text-zinc-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
      >
        {applying ? "サーバーに反映中..." : "プレビューに反映"}
      </button>
      {disabledReason ? (
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          {disabledReason}
        </p>
      ) : null}
      {state === "error" && error ? (
        <div
          role="alert"
          className="mt-3 rounded border border-rose-300/40 bg-rose-300/10 p-3 text-xs leading-5 text-rose-100"
        >
          <p className="font-bold">パッチ適用失敗</p>
          <p className="mt-1 break-words">{error}</p>
        </div>
      ) : null}
    </div>
  );
}

function VerifyTrigger({
  canRetest,
  disabledReason,
  isEditorMode,
  onSubmit,
}: {
  canRetest: boolean;
  disabledReason: string | null;
  isEditorMode: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-lg border border-cyan-300/20 bg-zinc-950 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
            Verify
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            {isEditorMode
              ? "コードを修正したら、ここから実際の攻撃テストで検証します。"
              : "修正案を選んだら、ここから実際の攻撃テストで検証します。"}
          </p>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canRetest}
          className="inline-flex h-11 items-center justify-center rounded border border-cyan-300/60 bg-cyan-300 px-5 text-sm font-black text-zinc-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
        >
          {isEditorMode ? "修正を検証する" : "修正案を検証する"}
        </button>
      </div>
      {disabledReason ? (
        <p className="mt-3 text-xs leading-5 text-zinc-400">{disabledReason}</p>
      ) : null}
    </div>
  );
}

function StickyMissionBar({
  currentStep,
  selectedPatchTitle,
  status,
}: {
  currentStep: number;
  selectedPatchTitle?: string;
  status: QuestUiStatus;
}) {
  return (
    <div className="sticky top-0 z-20 rounded-lg border border-cyan-300/20 bg-zinc-950/95 p-3 shadow-xl shadow-black/40 backdrop-blur">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-cyan-300/40 bg-cyan-300/10 px-2 py-1 text-xs font-black text-cyan-100">
            現在ステップ: Step {currentStep}
          </span>
          <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-bold text-zinc-300">
            状態: {getStatusLabel(status)}
          </span>
          {selectedPatchTitle ? (
            <span className="rounded border border-emerald-300/30 bg-emerald-300/10 px-2 py-1 text-xs font-bold text-emerald-100">
              選択中: {selectedPatchTitle}
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-6 text-zinc-300">
          次にやること: {getNextActionLabel(status)}
        </p>
      </div>
    </div>
  );
}

function ActiveStepHeader({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-zinc-800 pb-4">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <p className="max-w-3xl text-sm leading-6 text-zinc-400">
        {description}
      </p>
    </div>
  );
}

function StepSummaryList({
  attackedSummary,
  codeReviewed,
  currentStep,
  defenseState,
  hasAttacked,
  hasSelectedPatch,
  selectedPatchTitle,
}: {
  attackedSummary?: string;
  codeReviewed: boolean;
  currentStep: number;
  defenseState: DefenseState;
  hasAttacked: boolean;
  hasSelectedPatch: boolean;
  selectedPatchTitle?: string;
}) {
  const resultDone =
    defenseState === "success" ||
    defenseState === "failure" ||
    defenseState === "error";

  return (
    <div className="grid gap-1.5">
      <StepSummary
        active={currentStep === 1}
        complete={hasAttacked}
        description={
          hasAttacked
            ? (attackedSummary ?? "攻撃が刺さることを確認済み")
            : "未実行"
        }
        locked={false}
        title="Step 1：攻撃テスト"
      />
      <StepSummary
        active={currentStep === 2}
        complete={codeReviewed}
        description={codeReviewed ? "原因コードを確認済み" : "攻撃後に確認"}
        locked={!hasAttacked}
        title="Step 2：原因コード"
      />
      <StepSummary
        active={currentStep === 3}
        complete={hasSelectedPatch}
        description={selectedPatchTitle ?? "修正案を選択してください"}
        locked={!codeReviewed}
        title="Step 3：修正案"
      />
      <StepSummary
        active={currentStep === 4}
        complete={resultDone}
        description={getResultSummary(defenseState)}
        locked={!hasSelectedPatch}
        title="Step 4：再テスト"
      />
    </div>
  );
}

function StepSummary({
  active,
  complete,
  description,
  locked,
  title,
}: {
  active: boolean;
  complete: boolean;
  description: string;
  locked: boolean;
  title: string;
}) {
  return (
    <div
      className={`rounded border p-2.5 ${
        active
          ? "border-cyan-300/50 bg-cyan-300/10"
          : complete
            ? "border-emerald-300/30 bg-emerald-300/10"
            : locked
              ? "border-zinc-800 bg-zinc-950"
              : "border-zinc-700 bg-zinc-950"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-white">{title}</h3>
        <span
          className={`text-[10px] font-black ${
            complete
              ? "text-emerald-200"
              : locked
                ? "text-zinc-600"
                : "text-cyan-200"
          }`}
        >
          {complete ? "✓" : locked ? "LOCK" : active ? "NOW" : "NEXT"}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-4 text-zinc-400">{description}</p>
    </div>
  );
}

function getQuestUiStatus({
  attackState,
  codeReviewed,
  defenseState,
  hasSelectedPatch,
}: {
  attackState: AttackState;
  codeReviewed: boolean;
  defenseState: DefenseState;
  hasSelectedPatch: boolean;
}): QuestUiStatus {
  if (defenseState === "checking") {
    return "verifying";
  }

  if (defenseState === "success") {
    return "passed";
  }

  if (defenseState === "failure" || defenseState === "error") {
    return "failed";
  }

  if (hasSelectedPatch) {
    return "patchSelected";
  }

  if (codeReviewed) {
    return "codeReviewed";
  }

  if (attackState === "success") {
    return "attacked";
  }

  return "idle";
}

function getCurrentStep(status: QuestUiStatus, step1Confirmed: boolean) {
  if (status === "idle") {
    return 1;
  }

  if (status === "attacked") {
    // After the user exploits the bug we keep them on Step 1 until they
    // explicitly click "次へ", so they can keep poking at the live preview.
    return step1Confirmed ? 2 : 1;
  }

  if (status === "codeReviewed" || status === "patchSelected") {
    // patchSelected = "the user has a fix ready but hasn't clicked verify".
    // The verify trigger lives on step 3 now, so stay there until the
    // verify call actually starts.
    return 3;
  }

  return 4;
}

function ProceedToStep2({ onProceed }: { onProceed: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-4">
      <div>
        <p className="text-sm font-black text-emerald-100">
          ✓ 脆弱性を確認できました
        </p>
        <p className="mt-1 text-xs leading-5 text-emerald-50/80">
          満足するまでプレビューで攻撃を試せます。準備ができたら次のステップへ。
        </p>
      </div>
      <button
        type="button"
        onClick={onProceed}
        className="inline-flex h-11 items-center justify-center rounded border border-cyan-300/60 bg-cyan-300 px-5 text-sm font-black text-zinc-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-zinc-950"
      >
        次へ：脆弱なコードを確認する →
      </button>
    </div>
  );
}

function getCompletedSteps({
  attackState,
  codeReviewed,
  defenseState,
  hasSelectedPatch,
}: {
  attackState: AttackState;
  codeReviewed: boolean;
  defenseState: DefenseState;
  hasSelectedPatch: boolean;
}) {
  const completedSteps: number[] = [];

  if (attackState === "success") {
    completedSteps.push(1);
  }

  if (codeReviewed) {
    completedSteps.push(2);
  }

  if (hasSelectedPatch) {
    completedSteps.push(3);
  }

  if (defenseState === "success" || defenseState === "failure") {
    completedSteps.push(4);
  }

  return completedSteps;
}

function getStatusLabel(status: QuestUiStatus) {
  const labels: Record<QuestUiStatus, string> = {
    idle: "未開始",
    attacked: "攻撃済み",
    codeReviewed: "原因確認済み",
    patchSelected: "修正案選択済み",
    verifying: "検証中",
    passed: "防御成功",
    failed: "防御失敗",
  };

  return labels[status];
}

function getNextActionLabel(status: QuestUiStatus) {
  const labels: Record<QuestUiStatus, string> = {
    idle: "攻撃テストを実行",
    attacked: "原因コードを確認する",
    codeReviewed: "修正案を選択",
    patchSelected: "修正後に再テストする",
    verifying: "検証完了を待つ",
    passed: "結果と解説を確認",
    failed: "別の修正案を試す",
  };

  return labels[status];
}

function getResultSummary(defenseState: DefenseState) {
  if (defenseState === "success") {
    return "防御成功";
  }

  if (defenseState === "failure") {
    return "防御失敗";
  }

  if (defenseState === "error") {
    return "APIエラー";
  }

  if (defenseState === "checking") {
    return "検証中";
  }

  return "修正案選択後に実行";
}

function HintPanel({
  hints,
  hintsRevealed,
  onRevealHint,
}: {
  hints: string[];
  hintsRevealed: number;
  onRevealHint: () => void;
}) {
  if (hints.length === 0) return null;

  const allRevealed = hintsRevealed === hints.length;
  const remaining = hints.length - hintsRevealed;

  return (
    <div className="relative min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <p className="text-xs font-black uppercase tracking-[0.15em] text-zinc-500">
        ヒント
      </p>
      {hintsRevealed > 0 ? (
        <div className="mt-3 grid gap-2">
          {hints.slice(0, hintsRevealed).map((hint, i) => (
            <div
              key={i}
              className="rounded border border-zinc-700 bg-zinc-950 p-3"
            >
              <p className="mb-1 text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                ヒント {i + 1}
              </p>
              <p className="text-sm leading-6 text-zinc-300">{hint}</p>
            </div>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        onClick={onRevealHint}
        disabled={allRevealed}
        className="mt-3 inline-flex h-10 w-full items-center justify-center rounded border border-zinc-600 bg-zinc-800 px-4 text-sm font-bold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-600"
      >
        {allRevealed ? "ヒントは全て表示済み" : `ヒントを見る (残り${remaining})`}
      </button>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
