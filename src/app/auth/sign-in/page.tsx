"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
      });
      if (error) {
        toast.error(error.message || "Credenciales inválidas");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      toast.error("No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-canvas px-4 py-4 sm:py-8">
      <div className="pt-safe absolute right-4 top-4">
        <ThemeToggle variant="compact" />
      </div>

      <div className="w-full max-w-sm rounded-[24px] border border-border-subtle bg-surface p-4 sm:p-7">
        <div className="mb-5 flex flex-col items-center text-center">
          <BrandMark className="mb-2.5 h-11 w-11" />
          <h1 className="display-heading text-[28px] font-bold tracking-[-0.02em] text-ink sm:text-3xl">
            Altar &amp; Hechizos
          </h1>
          <p className="mt-1 text-[13px] text-ink-muted sm:text-sm">
            Acceso privado al grimorio y stock
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label
              htmlFor="signin-email"
              className="mb-1.5 block text-xs font-medium text-ink-muted"
            >
              Email
            </label>
            <input
              id="signin-email"
              type="email"
              inputMode="email"
              enterKeyHint="next"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full rounded-[12px] border border-border-subtle bg-canvas px-3.5 py-2.5 text-base text-ink placeholder:text-ink-dim outline-none transition focus:border-accent"
            />
          </div>

          <div>
            <label
              htmlFor="signin-password"
              className="mb-1.5 block text-xs font-medium text-ink-muted"
            >
              Contraseña
            </label>
            <input
              id="signin-password"
              type="password"
              enterKeyHint="go"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-[12px] border border-border-subtle bg-canvas px-3.5 py-2.5 text-base text-ink placeholder:text-ink-dim outline-none transition focus:border-accent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="apple-press flex min-h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            {loading ? "Ingresando..." : "Entrar al Grimorio"}
          </button>
        </form>
      </div>
    </main>
  );
}
