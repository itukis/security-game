"use client";

import { AttackPanel } from "@/components/AttackPanel";
import { CodeEditor } from "@/components/CodeEditor";
import { CodeViewer } from "@/components/CodeViewer";
import { PatchSelector } from "@/components/PatchSelector";
import { ResultPanel } from "@/components/ResultPanel";
import { VulnerableAppPreview } from "@/components/VulnerableAppPreview";
import { ActiveStepHeader } from "@/components/challenge-playground/ChallengeChrome";
import {
  PreviewApplyControl,
  ProceedToStep2,
  VerifyTrigger,
} from "@/components/challenge-playground/ChallengeControls";
import type {
  PlaygroundActions,
  PlaygroundModel,
} from "@/components/challenge-playground/types";
import { LivePreviewPane } from "@/components/challenge-playground/LivePreviewPane";

export function ChallengeStepContent({
  actions,
  model,
}: {
  actions: PlaygroundActions;
  model: PlaygroundModel;
}) {
  const { challenge, currentStep } = model;

  return (
    <>
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
          title="コードを修正"
          description={
            challenge.stepCopy?.step3Description ??
            "脆弱なコードを直接編集して、原因を取り除きましょう。"
          }
        />
      ) : null}
      {currentStep === 4 ? (
        <ActiveStepHeader
          eyebrow="Step 4"
          title="再テスト結果"
          description={
            challenge.stepCopy?.step4Description ??
            "編集したコードで脆弱性を防げるか、実際の攻撃テストで確認します。"
          }
        />
      ) : null}

      <div className="mt-4">
        {currentStep === 1 ? (
          <AttackStep model={model} actions={actions} />
        ) : null}
        {currentStep === 2 ? (
          <CodeReviewStep model={model} actions={actions} />
        ) : null}
        {currentStep === 3 ? (
          <PatchStep model={model} actions={actions} />
        ) : null}
        {currentStep === 4 ? (
          <ResultStep model={model} actions={actions} />
        ) : null}
      </div>
    </>
  );
}

function AttackStep({
  actions,
  model,
}: {
  actions: PlaygroundActions;
  model: PlaygroundModel;
}) {
  const { challenge } = model;

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        {model.isDockerBacked ? (
          <VulnerableAppPreview
            challenge={challenge}
            onExploitDetected={actions.handleRunAttack}
          />
        ) : (
          <StaticPreviewCard
            model={model}
            onRunAttack={actions.handleRunAttack}
          />
        )}
        <AttackPanel
          attackPayload={challenge.attackPayload}
          attackState={model.attackState}
          attackVerifiedMessage={
            challenge.attackVerifiedMessage ??
            "脆弱性が刺さる動きを確認しました"
          }
          disclaimer={
            challenge.attackVerifyDisclaimer ??
            "実際の脆弱アプリケーションに対して攻撃を実行し、防御を検証します。"
          }
          onRunAttack={actions.handleRunAttack}
        />
      </div>
      {model.attackState === "success" ? (
        <ProceedToStep2 onProceed={actions.handleProceedToStep2} />
      ) : null}
    </div>
  );
}

function StaticPreviewCard({
  model,
  onRunAttack,
}: {
  model: PlaygroundModel;
  onRunAttack: () => void;
}) {
  const { challenge } = model;

  return (
    <div className="relative min-w-0 rounded-lg border border-cyan-300/20 bg-zinc-950 p-4">
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Lightweight Preview
          </p>
          <h3 className="mt-1 break-words text-lg font-bold text-white">
            {challenge.vulnerableAppTitle}
          </h3>
          <p className="mt-1 break-all font-mono text-xs text-zinc-500">
            {challenge.targetEndpoint}
          </p>
        </div>
        <span className="rounded border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">
          static
        </span>
      </div>

      <div className="rounded border border-zinc-700 bg-black p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
          Payload
        </p>
        <p className="mt-2 break-all rounded bg-rose-400/10 px-2 py-1 font-mono text-sm text-rose-100">
          {challenge.attackPayload}
        </p>
        <p className="mt-4 text-sm leading-6 text-zinc-300">
          この問題は低メモリ公開版では軽量プレビューです。検証は静的パッチ判定で行います。
        </p>
      </div>

      <button
        type="button"
        onClick={onRunAttack}
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded border border-cyan-300/60 bg-cyan-300 px-4 text-sm font-black text-zinc-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-zinc-950"
      >
        攻撃テストを実行
      </button>
    </div>
  );
}

function CodeReviewStep({
  actions,
  model,
}: {
  actions: PlaygroundActions;
  model: PlaygroundModel;
}) {
  const { challenge } = model;

  return (
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
          onClick={actions.handleConfirmCodeReviewed}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded border border-cyan-300/60 bg-cyan-300 px-4 text-sm font-black text-zinc-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:ring-offset-2 focus:ring-offset-zinc-950 sm:w-auto"
        >
          原因コードを確認した
        </button>
      </div>
    </div>
  );
}

function PatchStep({
  actions,
  model,
}: {
  actions: PlaygroundActions;
  model: PlaygroundModel;
}) {
  return (
    <div className="grid min-w-0 gap-4">
      {model.difficulty.patchInput === "selector" ? (
        <PatchSelector
          options={model.challenge.patchOptions}
          selectedId={model.selectedPatchId}
          onSelect={actions.handleSelectPatch}
        />
      ) : (
        <EditorPatchArea model={model} actions={actions} />
      )}

      <VerifyTrigger
        canRetest={model.canRetest}
        disabledReason={model.retestDisabledReason}
        onSubmit={actions.handleSubmitPatch}
      />
    </div>
  );
}

function EditorPatchArea({
  actions,
  model,
}: {
  actions: PlaygroundActions;
  model: PlaygroundModel;
}) {
  const { challenge } = model;

  return (
    <div
      className={
        model.showLivePreview
          ? "grid min-w-0 gap-4 xl:grid-cols-2"
          : "grid min-w-0 gap-4"
      }
    >
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs leading-5 text-zinc-500">
          脆弱な箇所を見つけて、必要な範囲を直接修正してください。
          差分は src/server.js へのパッチとして検証されます。
        </p>
        <CodeEditor
          value={model.editorCode}
          language="javascript"
          onChange={actions.handleEditorChange}
          onReset={() => actions.handleEditorChange(challenge.initialCode)}
        />
        {model.mode === "editPreview" && model.showLivePreview ? (
          <PreviewApplyControl
            disabledReason={
              !model.hasEditedCode
                ? "コードを編集するとプレビューに反映できます。"
                : model.previewApplyState === "applied"
                  ? "現在の編集内容は反映済みです。"
                  : null
            }
            error={model.previewApplyError}
            state={model.previewApplyState}
            onApply={actions.handlePreviewApply}
          />
        ) : null}
      </div>
      <LivePreviewPane model={model} />
    </div>
  );
}

function ResultStep({
  actions,
  model,
}: {
  actions: PlaygroundActions;
  model: PlaygroundModel;
}) {
  const { challenge } = model;

  return (
    <>
      {model.showLivePreview ? (
        <div className="mb-4">
          <LivePreviewPane model={model} />
        </div>
      ) : null}
      <ResultPanel
        canRetest={model.canRetest}
        challenge={challenge}
        defenseState={model.defenseState}
        disabledReason={model.retestDisabledReason}
        errorMessage={model.verifyError}
        loadingStep={model.loadingStep}
        onBackToEditor={actions.handleBackToEditor}
        onReset={actions.handleResetMission}
        onRetest={actions.handleSubmitPatch}
        onTryAnotherPatch={actions.handleTryAnotherPatch}
        selectedPatchTitle={model.selectedPatchTitle}
        verifyResult={model.verifyResult}
        onRevealHint={
          model.difficulty.hints === "onDemand" &&
          model.hintsRevealed < challenge.hints.length
            ? actions.handleRevealHint
            : undefined
        }
        hintRevealLabel={`次のヒントを見る (${model.hintsRevealed + 1}/${challenge.hints.length})`}
      />
    </>
  );
}
