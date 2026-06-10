"use client";

import { ProgressStepper } from "@/components/ProgressStepper";
import {
  DifficultySwitcher,
  StickyMissionBar,
} from "@/components/challenge-playground/ChallengeChrome";
import { ChallengeSidebar } from "@/components/challenge-playground/ChallengeSidebar";
import { ChallengeStepContent } from "@/components/challenge-playground/ChallengeStepContent";
import type { PlaygroundState } from "@/components/challenge-playground/types";

export function ChallengePlaygroundView({ state }: { state: PlaygroundState }) {
  const { model, actions } = state;
  const { challenge, completedSteps, currentStep, mode, selectedPatchTitle, uiStatus } =
    model;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <DifficultySwitcher
        mode={mode}
        availableModes={model.availableModes}
        problemDifficulty={challenge.difficulty}
        onChange={actions.handleModeChange}
      />

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
        <ChallengeSidebar model={model} actions={actions} />

        <section className="relative z-0 min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-xl shadow-black/30 sm:p-5">
          <ChallengeStepContent model={model} actions={actions} />
        </section>
      </div>
    </div>
  );
}
