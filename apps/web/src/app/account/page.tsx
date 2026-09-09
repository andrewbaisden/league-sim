"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { authClient } from "@/lib/auth-client";

interface AccountForm {
  name: string;
  email: string;
  password: string;
}

export default function AccountPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [message, setMessage] = useState("");
  const { register, handleSubmit, formState } = useForm<AccountForm>();

  const submit = handleSubmit(async (values) => {
    setMessage("");
    const result =
      mode === "sign-up"
        ? await authClient.signUp.email({
            name: values.name,
            email: values.email,
            password: values.password,
          })
        : await authClient.signIn.email({ email: values.email, password: values.password });
    setMessage(result.error?.message ?? "Signed in. Your simulation history is now available.");
  });

  if (sessionPending) return <main className="shell empty">Loading account…</main>;
  if (session) {
    return (
      <main className="shell" style={{ padding: "64px 0" }}>
        <section className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
          <div className="card-head">
            <div>
              <span className="eyebrow">Account</span>
              <h1 style={{ margin: "8px 0 0" }}>Welcome, {session.user.name}</h1>
            </div>
          </div>
          <div className="sim-body" style={{ color: "var(--ink)" }}>
            <p className="hero-copy">
              Saved scenarios and simulation history are attached to {session.user.email}.
            </p>
            <button
              className="button button-primary"
              type="button"
              onClick={() => authClient.signOut()}
            >
              Sign out
            </button>
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
            onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          >
            {mode === "sign-in" ? "Need an account? Create one" : "Already registered? Sign in"}
          </button>
          {message ? (
            <p aria-live="polite" style={{ color: "var(--muted)", fontSize: ".78rem" }}>
              {message}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
