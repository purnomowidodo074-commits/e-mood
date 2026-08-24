"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/authClient";
import { AppBackground } from "@/components/AppBackground";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await authClient.signIn.email({ email, password });
    if (signInError) {
      setError("Email atau password salah.");
      setLoading(false);
      return;
    }

    const { data: tokenData, error: tokenError } = await authClient.token();
    if (tokenError || !tokenData?.token) {
      setError("Gagal membuat sesi. Coba lagi.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenData.token }),
    });
    if (!res.ok) {
      setError("Gagal membuat sesi. Coba lagi.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <AppBackground />

      <header className="relative z-10 px-6 py-4">
        <Image src="/logo.png" alt="Toyota" width={140} height={40} className="h-10 w-auto object-contain" priority />
      </header>

      <div className="relative flex flex-1 items-center justify-center px-4">
        <div className="anim-fade-up relative w-full max-w-sm rounded-2xl border border-border bg-surface/90 p-8 shadow-2xl backdrop-blur-sm">
          <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-sm font-bold text-primary-foreground shadow-[0_0_24px_-6px_var(--primary)]">
            H
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Masuk ke Happiness</h1>
          <p className="mt-1 text-sm text-muted-foreground">Akses dashboard dan admin absen emosi.</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>

            {error && (
              <p role="alert" className="anim-fade text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-11 cursor-pointer rounded-lg bg-primary font-medium text-primary-foreground transition-all duration-[var(--dur-fast)] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
