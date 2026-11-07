"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Loader2 } from "lucide-react";
import { GoogleIcon } from "../utils/SocialIcons";
import {
  FALLBACK_ERROR,
  resolveAuthError,
} from "../../../utils/Auth/AuthErrors";
import Field from "../utils/Form/Field";
import TextInput from "../utils/Form/TextInput";
import PasswordInput from "../utils/Form/PasswordInput";
import PageWrapper from "../utils/PageWrapper";

export default function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();

  const callbackUrl = sp.get("callbackUrl") || "/";
  const queryError = resolveAuthError(sp.get("error"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"credentials" | "google" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const message = formError ?? queryError;
  const isBusy = busy !== null;

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy("credentials");

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result) {
        setFormError(FALLBACK_ERROR);
        return;
      }

      if (result.error) {
        setFormError(resolveAuthError(result.error));
        return;
      }

      const destination = result.url ?? callbackUrl;
      router.replace(destination);
      router.refresh();
    } catch {
      setFormError(FALLBACK_ERROR);
    } finally {
      setBusy(null);
    }
  }

  function handleGoogle() {
    setBusy("google");
    signIn("google", { callbackUrl });
  }

  return (
    <PageWrapper variant="form">
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-white/60 p-6 backdrop-blur-md shadow-sm shadow-stone-900/5 sm:p-8">
            <h1 className="mt-5 text-xl font-semibold text-center text-stone-900">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-center leading-relaxed text-stone-600">
              Login to manage your account.
            </p>

            {message && (
              <div
                role="alert"
                aria-live="polite"
                className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <div className="space-y-1.5">
                  <p>{message}</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogle}
              disabled={isBusy}
              className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition hover:border-rose-200 hover:bg-rose-50/40 disabled:opacity-60"
            >
              {busy === "google" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-stone-200" />
              <span className="text-[11px] font-medium tracking-wider text-stone-400 uppercase">
                or
              </span>
              <span className="h-px flex-1 bg-stone-200" />
            </div>

            <form onSubmit={handleCredentials} className="space-y-3" noValidate>
              <Field label="Email" required>
                <TextInput
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@craftinagma.com"
                />
              </Field>

              <Field label="Password" required>
                <PasswordInput
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>

              <button
                type="submit"
                disabled={isBusy}
                className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-rose-500/25 transition hover:bg-rose-600 disabled:opacity-60 active:scale-[0.98]"
              >
                {busy === "credentials" && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Login
              </button>
            </form>

            <p className="mt-5 flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-center text-xs font-medium text-stone-600 transition-colors">
              <span className="text-rose-600">New User?</span> Signup with
              Google today!
            </p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
