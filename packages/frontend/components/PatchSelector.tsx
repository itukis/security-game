import type { PatchOption } from "@/lib/challengeTypes";

type PatchSelectorProps = {
  disabled: boolean;
  disabledReason: string | null;
  patchOptions: PatchOption[];
  selectedPatchId: string | null;
  onSelectPatch: (patchId: string) => void;
};

export function PatchSelector({
  disabled,
  disabledReason,
  patchOptions,
  selectedPatchId,
  onSelectPatch,
}: PatchSelectorProps) {
  return (
    <section className="relative min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-xl shadow-black/30 sm:p-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">
          Patch Select
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">
          Step 3：修正案を選択
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          攻撃テスト後に、原因を取り除く修正案を1つ選んでください。
        </p>
      </div>

      {disabledReason ? (
        <div className="mt-5 rounded border border-amber-300/40 bg-amber-300/10 p-3 text-sm font-semibold text-amber-100">
          {disabledReason}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        {patchOptions.map((patch) => {
          const isSelected = selectedPatchId === patch.id;

          return (
            <button
              type="button"
              key={patch.id}
              onClick={() => onSelectPatch(patch.id)}
              disabled={disabled}
              className={`rounded-lg border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-55 ${
                isSelected
                  ? "border-cyan-300 bg-cyan-300/12 shadow-lg shadow-cyan-950/50"
                  : "border-zinc-700 bg-zinc-950 hover:border-zinc-500"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${
                    isSelected
                      ? "border-cyan-200 bg-cyan-300"
                      : "border-zinc-500 bg-zinc-900"
                  }`}
                />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {patch.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    {patch.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
