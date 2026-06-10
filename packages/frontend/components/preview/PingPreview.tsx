"use client";

import { useId, useState, type FormEvent } from "react";

export function PingPreview({
  onExploitDetected,
}: {
  onExploitDetected?: () => void;
}) {
  const fieldId = useId();
  const [host, setHost] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const hasCommandSeparator = /[;&|`$()]/.test(host);
    if (hasCommandSeparator) {
      onExploitDetected?.();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative min-w-0 rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-zinc-950 text-sm font-black text-violet-200">
          NET
        </div>
        <div>
          <p className="text-sm font-bold">Network Diagnostics</p>
          <p className="text-xs text-zinc-500">beta build / review needed</p>
        </div>
      </div>

      <div className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-600">
        <span className="text-zinc-400">POST</span>{" "}
        <span className="font-semibold text-zinc-800">/ping</span>
      </div>

      <label className="mt-4 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
        ホスト
        <input
          className="mt-2 h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm font-mono text-zinc-800"
          value={host}
          onChange={(e) => {
            const v = e.target.value;
            const inputType = (e.nativeEvent as InputEvent).inputType;
            if (inputType !== "insertFromPaste" && v.includes("(Header:")) return;
            setHost(v);
          }}
          placeholder="ここにペイロードを入力してみよう"
          autoComplete="one-time-code"
          name={`field-${fieldId}-host`}
          spellCheck={false}
        />
      </label>

      <button
        type="submit"
        className="mt-3 h-11 w-full rounded bg-zinc-950 text-sm font-bold text-white transition hover:bg-zinc-800"
      >
        POST /ping
      </button>

      <div className="mt-3 rounded border border-zinc-200 bg-black px-3 py-2 font-mono text-xs text-zinc-300">
        {host ? (
          <>
            <p className="text-zinc-500">$ ping -c 1 {host}</p>
            <p className="mt-1 text-emerald-400">
              PING {host.split(/[;&|`$()]/)[0].trim() || host} ... 1 packets
              transmitted
            </p>
            {/[;&|`$()]/.test(host) ? (
              <p className="mt-1 text-rose-400">
                root:x:0:0:root:/root:/bin/bash ...
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-zinc-500">$ ping -c 1 {"<host>"}</p>
        )}
      </div>
    </form>
  );
}
