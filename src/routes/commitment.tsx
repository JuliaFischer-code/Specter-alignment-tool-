import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { promptScript, useCommitment } from "@/lib/commitment-store";

export const Route = createFileRoute("/commitment")({
  head: () => ({
    meta: [
      { title: "Commitment Document — Uncertainty Navigator" },
      {
        name: "description",
        content:
          "The signed commitment generated from your affordable-loss conversation.",
      },
      { property: "og:title", content: "Commitment Document" },
      {
        property: "og:description",
        content:
          "A one-page commitment generated from your pre-pilot conversation.",
      },
    ],
  }),
  component: CommitmentPage,
});

const sections: {
  title: string;
  fields: { id: keyof typeof promptScript[number]["id"] | string; label: string }[];
}[] = [
  {
    title: "I. Identification",
    fields: [
      { id: "pilotName", label: "Pilot" },
      { id: "sponsor", label: "Accountable Sponsor" },
    ],
  },
  {
    title: "II. Hypothesis",
    fields: [{ id: "hypothesis", label: "Falsifiable Claim" }],
  },
  {
    title: "III. Affordable Loss",
    fields: [
      { id: "budgetCeiling", label: "Budget Ceiling" },
      { id: "timeBox", label: "Time-box" },
      { id: "reputationalRisk", label: "Reputational Exposure" },
      { id: "opportunityCost", label: "Opportunity Cost" },
    ],
  },
  {
    title: "IV. Decision Gates",
    fields: [
      { id: "killCriteria", label: "Kill Criteria" },
      { id: "successSignals", label: "Continue Signals" },
    ],
  },
];

function CommitmentPage() {
  const { data, hydrated } = useCommitment();

  if (!hydrated) return <AppShell><div className="h-screen" /></AppShell>;

  if (!data || !data.createdAt) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1240px] px-8 py-32 text-center">
          <div className="eyebrow">No commitment on file</div>
          <h1 className="mt-4 font-serif text-[40px]">
            Start the conversation first.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            The commitment document is generated from your answers in Screen 01.
          </p>
          <Link
            to="/"
            className="mt-8 inline-block bg-primary px-6 py-3 text-[13px] text-primary-foreground hover:opacity-90"
          >
            Begin conversation →
          </Link>
        </div>
      </AppShell>
    );
  }

  const created = new Date(data.createdAt);
  const docId = "UN-" + created.getTime().toString(36).toUpperCase().slice(-6);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1240px] px-8 pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Screen 02 · Generated commitment</div>
            <h1 className="mt-3 font-serif text-[44px] leading-[1.05]">
              Pilot Commitment Document
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="border border-border bg-background px-4 py-2 text-[12px] text-foreground hover:bg-muted"
            >
              Print / Export PDF
            </button>
            <Link
              to="/check-in"
              className="bg-primary px-4 py-2 text-[12px] text-primary-foreground hover:opacity-90"
            >
              Run check-in →
            </Link>
          </div>
        </div>
      </div>

      <article className="mx-auto mt-10 max-w-[1240px] px-8">
        <div className="border border-border bg-card p-12 lg:p-16">
          {/* Doc header */}
          <div className="grid grid-cols-12 gap-8 border-b border-border pb-8">
            <div className="col-span-12 md:col-span-7">
              <div className="number-tag">{docId}</div>
              <h2 className="mt-3 font-serif text-[40px] leading-[1.05]">
                {data.pilotName || "Untitled pilot"}
              </h2>
              <p className="mt-3 max-w-xl text-[14px] text-muted-foreground">
                This document records the team's pre-commitment to an affordable
                loss. It supersedes informal expectations and is the reference
                used at every check-in.
              </p>
            </div>
            <div className="col-span-12 space-y-4 text-[12px] md:col-span-5">
              <Meta label="Issued" value={created.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} />
              <Meta label="Sponsor" value={data.sponsor || "—"} />
              <Meta label="Time-box" value={data.timeBox || "—"} />
              <Meta label="Ceiling" value={data.budgetCeiling || "—"} />
            </div>
          </div>

          {/* Body */}
          <div className="mt-10 space-y-12">
            {sections.map((s) => (
              <section key={s.title}>
                <h3 className="eyebrow">{s.title}</h3>
                <div className="mt-5 divide-y divide-border border-y border-border">
                  {s.fields.map((f) => (
                    <div
                      key={f.id}
                      className="grid grid-cols-12 gap-6 py-5"
                    >
                      <div className="col-span-12 md:col-span-3">
                        <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                          {f.label}
                        </div>
                      </div>
                      <div className="col-span-12 md:col-span-9">
                        <p className="text-[15px] leading-relaxed text-foreground">
                          {(data as any)[f.id] || (
                            <span className="italic text-muted-foreground">
                              Not specified
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Signature */}
          <div className="mt-16 grid grid-cols-2 gap-12 border-t border-border pt-10">
            <SignatureBlock label="Sponsor" name={data.sponsor} />
            <SignatureBlock label="Pilot Lead" name="" />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between text-[12px] text-muted-foreground">
          <span>Generated from Screen 01 · Affordable Loss conversation</span>
          <Link to="/" className="underline-offset-4 hover:underline">
            ← Edit answers
          </Link>
        </div>
      </article>

      <div className="h-24" />
    </AppShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
      <span className="font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-right text-foreground">{value}</span>
    </div>
  );
}

function SignatureBlock({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <div className="h-12 border-b border-foreground/40" />
      <div className="mt-2 flex items-baseline justify-between">
        <span className="eyebrow">{label}</span>
        <span className="text-[13px] text-foreground">{name || "—"}</span>
      </div>
    </div>
  );
}