type ProgressStepperProps = {
  completedSteps: number[];
  currentStep: number;
  step2Subtitle?: string;
};

const defaultSteps = [
  {
    id: 1,
    title: "攻撃テスト",
    description: "弱点があるか確認",
  },
  {
    id: 2,
    title: "原因コードを確認",
    description: "原因の組み立てを見る",
  },
  {
    id: 3,
    title: "コードを修正",
    description: "安全なコードに直す",
  },
  {
    id: 4,
    title: "再テスト結果",
    description: "防御できたか確認",
  },
];

export function ProgressStepper({
  completedSteps,
  currentStep,
  step2Subtitle,
}: ProgressStepperProps) {
  const steps = step2Subtitle
    ? defaultSteps.map((step) =>
        step.id === 2 ? { ...step, description: step2Subtitle } : step,
      )
    : defaultSteps;

  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-900/95 p-3 shadow-xl shadow-black/30">
      <div className="grid gap-2 sm:grid-cols-4">
        {steps.map((step) => {
          const isComplete = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;

          return (
            <div
              key={step.id}
              className={`rounded border px-3 py-2 transition ${
                isCurrent
                  ? "border-cyan-300 bg-cyan-300/10"
                  : isComplete
                    ? "border-emerald-300/40 bg-emerald-300/10"
                    : "border-zinc-800 bg-zinc-950/70 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-black ${
                    isComplete
                      ? "border-emerald-300 bg-emerald-300 text-zinc-950"
                      : isCurrent
                        ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                        : "border-zinc-700 bg-zinc-900 text-zinc-500"
                  }`}
                >
                  {isComplete ? "✓" : step.id}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Step {step.id}
                </span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-white">
                {step.title}
              </h3>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
