import { problems } from "./constants";

export function MembershipProblemSection() {
  return (
    <section className="bg-background py-20 dark:bg-muted/10">
      <div className="mx-auto max-w-7xl px-6">
        {/* ── Header ── */}
        <div className="mb-14 text-center">
          <span className="mb-3 inline-block rounded-full bg-destructive/10 px-4 py-1.5 text-xs  text-destructive">
            Kamu relate?
          </span>
          <h2 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
            Mau grooming rutin, tapi&hellip;
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Banyak Pawrents menghadapi masalah yang sama sebelum bergabung
            dengan Pawship Membership.
          </p>
        </div>

        {/* ── Cards ── */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map((p, i) => (
            <div
              key={p.title}
              className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
            >
              {/* ghost number */}
              <span className="pointer-events-none absolute -right-2 -top-3 select-none text-[5rem] font-black leading-none text-foreground/[0.04]">
                {i + 1}
              </span>

              {/* icon */}
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors duration-300 group-hover:bg-destructive/10 group-hover:text-destructive">
                <p.icon className="h-5 w-5" />
              </div>

              {/* text */}
              <div className="relative z-10 flex flex-col gap-1.5">
                <h3 className="font-display text-sm font-bold text-foreground">
                  {p.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
