"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { authClient } from "@/lib/auth-client";

interface AccountForm {
  name: string;
  email: string;
  password: string;
}

interface SavedScenario {
  id: string;
  name: string;
  baseSnapshotId: string;
  updatedAt: string;
  batches: Array<{ id: string; kind: string; status: string; runCount: number }>;
}

export default function AccountPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending, refetch } = authClient.useSession();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [scenariosError, setScenariosError] = useState("");
  const { register, handleSubmit, formState, reset } = useForm<AccountForm>();

  useEffect(() => {
    if (!session) {
      setScenarios([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/v1/scenarios");
      if (!response.ok) {
        if (!cancelled) {
          setScenariosError(
            response.status === 401
              ? "Session expired. Sign in again."
              : "Could not load saved scenarios. Is Postgres migrated and seeded?",
          );
        }
        return;
      }
      const payload = (await response.json()) as { scenarios: SavedScenario[] };
      if (!cancelled) {
        setScenarios(payload.scenarios);
        setScenariosError("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const submit = handleSubmit(async (values) => {
    setMessage("");
    setErrorMessage("");
    const result =
      mode === "sign-up"
        ? await authClient.signUp.email({
            name: values.name,
            email: values.email,
            password: values.password,
          })
        : await authClient.signIn.email({ email: values.email, password: values.password });

    if (result.error) {
      setErrorMessage(
        result.error.message ??
          "Authentication failed. Ensure Postgres is running and you ran pnpm db:setup.",
      );
      return;
    }

    await refetch();
    router.refresh();
    reset({ name: "", email: "", password: "" });
    setMessage(
      mode === "sign-up"
        ? "Account created. You are signed in."
        : "Signed in. You can save scenarios from the season workspace.",
    );
  });

  if (sessionPending) return <main className="shell empty">Loading account…</main>;
  if (session) {
    return (
      <main className="shell" style={{ padding: "64px 0" }}>
        <section className="card" style={{ maxWidth: 720, margin: "0 auto 20px" }}>
          <div className="card-head">
            <div>
              <span className="eyebrow">Signed in</span>
              <h1 style={{ margin: "8px 0 0" }}>Welcome, {session.user.name}</h1>
            </div>
            <span className="status-pill signed-in">Active session</span>
          </div>
          <div className="sim-body" style={{ color: "var(--ink)" }}>
            <p className="hero-copy">
              Signed in as <strong>{session.user.email}</strong>. Saved scenarios and simulation
              history are attached to this account.
            </p>
            <div className="button-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Link className="button button-primary" href="/#simulation">
                Go to simulator
              </Link>
              <button
                className="button button-secondary light"
                type="button"
                onClick={async () => {
                  await authClient.signOut();
                  await refetch();
                  router.refresh();
                }}
              >
                Sign out
              </button>
            </div>
            {message ? (
              <p aria-live="polite" style={{ color: "var(--green)", fontSize: ".78rem" }}>
                {message}
              </p>
            ) : null}
          </div>
        </section>
        <section className="card" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="card-head">
            <div>
              <h2 style={{ margin: 0 }}>Saved scenarios</h2>
              <p>Reopen a persisted season batch on any team page</p>
            </div>
          </div>
          <div className="sim-body" style={{ color: "var(--ink)" }}>
            {scenariosError ? <p className="workspace-error">{scenariosError}</p> : null}
            {scenarios.length === 0 ? (
              <p className="workspace-empty" style={{ padding: 0 }}>
                No saved scenarios yet. Simulate a season on the home page, then click Save
                scenario.
              </p>
            ) : (
              <div className="scenario-list">
                {scenarios.map((scenario) => {
                  const seasonBatch = scenario.batches.find((batch) => batch.kind === "SEASON");
                  return (
                    <article key={scenario.id} className="scenario-row">
                      <div>
                        <strong>{scenario.name}</strong>
                        <p>
                          Updated {new Date(scenario.updatedAt).toLocaleString("en-GB")} ·{" "}
                          {scenario.batches.length} linked batch
                          {scenario.batches.length === 1 ? "" : "es"}
                        </p>
                      </div>
                      {seasonBatch ? (
                        <Link
                          className="button button-secondary light"
                          href={`/teams/arsenal?batchId=${seasonBatch.id}`}
                        >
                          Open sample team
                        </Link>
                      ) : (
                        <span className="muted">No season batch</span>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="shell" style={{ padding: "64px 0" }}>
      <section className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="card-head">
          <div>
            <span className="eyebrow">Saved scenarios</span>
            <h1 style={{ margin: "8px 0 0" }}>
              {mode === "sign-in" ? "Sign in" : "Create account"}
            </h1>
          </div>
        </div>
        <form className="sim-body" style={{ color: "var(--ink)" }} onSubmit={submit}>
          {mode === "sign-up" ? (
            <label>
              <span className="control-label" style={{ color: "var(--muted)" }}>
                Name
              </span>
              <input
                className="account-input"
                autoComplete="name"
                {...register("name", { required: true })}
              />
            </label>
          ) : null}
          <label>
            <span className="control-label" style={{ color: "var(--muted)" }}>
              Email
            </span>
            <input
              className="account-input"
              type="email"
              autoComplete="email"
              {...register("email", { required: true })}
            />
          </label>
          <label>
            <span className="control-label" style={{ color: "var(--muted)" }}>
              Password
            </span>
            <input
              className="account-input"
              type="password"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              minLength={10}
              {...register("password", { required: true })}
            />
          </label>
          <button className="button button-primary" disabled={formState.isSubmitting} type="submit">
            {formState.isSubmitting
              ? "Working…"
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => {
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              setErrorMessage("");
              setMessage("");
            }}
          >
            {mode === "sign-in" ? "Need an account? Create one" : "Already registered? Sign in"}
          </button>
          {errorMessage ? (
            <p className="workspace-error" aria-live="assertive" style={{ padding: 0 }}>
              {errorMessage}
            </p>
          ) : null}
          {message ? (
            <p aria-live="polite" style={{ color: "var(--green)", fontSize: ".78rem" }}>
              {message}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
