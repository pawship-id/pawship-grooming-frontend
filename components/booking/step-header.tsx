"use client";

import { Check, Lock } from "lucide-react";

export function StepHeader({
  step,
  title,
  done,
}: {
  step: number;
  title: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          done
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : step}
      </span>
      <h2 className="font-display text-lg font-bold text-foreground">
        {title}
      </h2>
    </div>
  );
}

export function LockedSection({
  step,
  title,
}: {
  step: number;
  title: string;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3 opacity-40 select-none">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
          {step}
        </span>
        <h2 className="font-display text-lg font-bold text-foreground">
          {title}
        </h2>
      </div>
      <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/40 bg-muted/20 py-5">
        <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground/60">
          Selesaikan langkah sebelumnya untuk melanjutkan
        </p>
      </div>
    </section>
  );
}
