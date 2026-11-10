"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api } from "@/lib/api";
import { brand } from "@/lib/brand";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/Glass";
import { GlassShell } from "@/components/layout/GlassShell";

type FormState = {
  display_name: string;
  username: string;
  email: string;
  password: string;
  referral_code: string;
};

const STEPS = [
  {
    id: "nome",
    kicker: "Largada",
    title: "Como te chamam?",
    hint: "Pode ser o nome de verdade ou o apelido da pista.",
  },
  {
    id: "handle",
    kicker: "Identidade",
    title: "Escolhe teu handle",
    hint: "Único, curto, marcante. Vai aparecer em desafios e rankings.",
  },
  {
    id: "email",
    kicker: "Contato",
    title: "Qual o teu email?",
    hint: "Usamos pra entrar na conta — sem spam de grid.",
  },
  {
    id: "senha",
    kicker: "Segurança",
    title: "Cria uma senha",
    hint: "Mínimo 8 caracteres. Guarda bem — é a chave da garagem.",
  },
  {
    id: "go",
    kicker: "Checkered",
    title: "Pronto pra largar?",
    hint: "Confere os dados e entra no ecossistema DESAFIOS REAIS.",
  },
] as const;

const ease = [0.22, 1, 0.36, 1] as const;

export function CadastroClient() {
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const refCode = params.get("ref") || "";

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState<FormState>({
    display_name: "",
    username: "",
    email: "",
    password: "",
    referral_code: refCode,
  });

  useEffect(() => {
    if (refCode) {
      setForm((f) => ({ ...f, referral_code: refCode }));
    }
  }, [refCode]);

  const progress = ((step + 1) / STEPS.length) * 100;
  const meta = STEPS[step];

  const usernameClean = useMemo(
    () => form.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
    [form.username],
  );

  const passwordScore = useMemo(() => {
    const p = form.password;
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(s, 4);
  }, [form.password]);

  const go = useCallback(
    (next: number) => {
      setError(null);
      setDir(next > step ? 1 : -1);
      setStep(next);
    },
    [step],
  );

  function validateStep(i: number): string | null {
    if (i === 0 && form.display_name.trim().length < 2) {
      return "Conta pra gente: pelo menos 2 letras no nome.";
    }
    if (i === 1) {
      if (usernameClean.length < 3) return "Handle com no mínimo 3 caracteres.";
      if (!/^[a-z0-9_]+$/.test(usernameClean)) {
        return "Só letras minúsculas, números e _.";
      }
    }
    if (i === 2) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        return "Email parece inválido — confere aí.";
      }
    }
    if (i === 3 && form.password.length < 8) {
      return "Senha com no mínimo 8 caracteres.";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    if (step === 1 && form.username !== usernameClean) {
      setForm((f) => ({ ...f, username: usernameClean }));
    }
    go(Math.min(step + 1, STEPS.length - 1));
  }

  function back() {
    go(Math.max(step - 1, 0));
  }

  async function submit() {
    const err = validateStep(3);
    if (err) {
      setError(err);
      go(3);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const email = form.email.trim();
      const password = form.password;
      await api.register({
        email,
        password,
        username: usernameClean || form.username.trim().toLowerCase(),
        display_name: form.display_name.trim(),
        referral_code: form.referral_code.trim() || undefined,
      });
      // Register already sets the session cookie; login is a safe fallback
      // for older API deploys that only create the user.
      try {
        await api.me();
      } catch {
        await api.login({ email, password });
      }
      setDone(true);
      window.setTimeout(() => router.push("/app"), reduce ? 400 : 1100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (step < STEPS.length - 1) next();
    else void submit();
  }

  const slide = reduce
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: { x: dir > 0 ? 56 : -56, opacity: 0, filter: "blur(6px)" },
        center: { x: 0, opacity: 1, filter: "blur(0px)" },
        exit: { x: dir > 0 ? -40 : 40, opacity: 0, filter: "blur(4px)" },
      };

  return (
    <GlassShell bg={brand.images.winners} className="!pt-[4.75rem] md:!pt-24">
      <div className="mx-auto w-full max-w-lg px-1 sm:px-0">
        {/* Progress */}
        <div className="mb-4 px-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lime">
              Cadastro · {step + 1}/{STEPS.length}
            </p>
            {refCode && (
              <span className="rounded-full border border-lime/30 bg-lime/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lime">
                Indicação {refCode}
              </span>
            )}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-lime shadow-[0_0_16px_rgba(199,240,0,0.55)]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.45, ease }}
            />
          </div>
          <div className="mt-3 flex gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Passo ${i + 1}`}
                onClick={() => {
                  if (i < step) go(i);
                }}
                className={`h-1.5 flex-1 rounded-full transition ${
                  i <= step ? "bg-lime/80" : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>

        <GlassPanel className="relative overflow-hidden !rounded-[28px] p-5 sm:p-8">
          {!reduce && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-lime/20 blur-3xl"
              animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.15, 1] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          <AnimatePresence mode="wait" custom={dir}>
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 text-center"
              >
                <motion.div
                  className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-lime text-racing"
                  initial={{ rotate: -20, scale: 0.6 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 16 }}
                >
                  <span className="font-display text-2xl">OK</span>
                </motion.div>
                <h2 className="font-display text-4xl text-white sm:text-5xl">Conta criada</h2>
                <p className="mt-2 text-silver">Te levando pra pista…</p>
              </motion.div>
            ) : (
              <motion.div
                key={meta.id}
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.38, ease }}
                onKeyDown={onKeyDown}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-lime">
                  {meta.kicker}
                </p>
                <h1 className="mt-2 font-display text-[2.35rem] leading-[0.95] tracking-wide text-white sm:text-5xl">
                  {meta.title}
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-silver sm:text-base">{meta.hint}</p>

                <div className="mt-7 space-y-4">
                  {step === 0 && (
                    <WizardField
                      label="Nome na pista"
                      autoFocus
                      value={form.display_name}
                      onChange={(v) => setForm((f) => ({ ...f, display_name: v }))}
                      placeholder="Ex: Nico, Rapidinha, Cap."
                    />
                  )}

                  {step === 1 && (
                    <div>
                      <WizardField
                        label="Username"
                        autoFocus
                        value={form.username}
                        onChange={(v) => setForm((f) => ({ ...f, username: v }))}
                        placeholder="ex: nico_smk"
                        prefix="@"
                      />
                      <AnimatePresence>
                        {usernameClean.length >= 3 && (
                          <motion.p
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-3 text-sm text-lime"
                          >
                            Vai rolar como <span className="font-semibold">@{usernameClean}</span>
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {step === 2 && (
                    <WizardField
                      label="Email"
                      autoFocus
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                      placeholder="voce@email.com"
                    />
                  )}

                  {step === 3 && (
                    <div>
                      <WizardField
                        label="Senha"
                        autoFocus
                        type="password"
                        autoComplete="new-password"
                        value={form.password}
                        onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                        placeholder="••••••••"
                      />
                      <div className="mt-3 flex gap-1.5">
                        {[0, 1, 2, 3].map((i) => (
                          <motion.div
                            key={i}
                            className="h-1.5 flex-1 rounded-full bg-white/10"
                            animate={{
                              backgroundColor:
                                passwordScore > i
                                  ? passwordScore >= 3
                                    ? "rgb(199, 240, 0)"
                                    : "rgb(250, 204, 21)"
                                  : "rgba(255,255,255,0.12)",
                            }}
                          />
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-silver">
                        {passwordScore <= 1 && "Fraca — aumenta um pouco."}
                        {passwordScore === 2 && "Ok pra largar."}
                        {passwordScore >= 3 && "Forte. Pode acelerar."}
                      </p>
                      {!refCode && (
                        <div className="mt-5">
                          <WizardField
                            label="Código de indicação (opcional)"
                            value={form.referral_code}
                            onChange={(v) => setForm((f) => ({ ...f, referral_code: v }))}
                            placeholder="Se alguém te convidou"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-4">
                      <ReviewRow label="Nome" value={form.display_name || "—"} />
                      <ReviewRow label="Handle" value={`@${usernameClean || "—"}`} />
                      <ReviewRow label="Email" value={form.email || "—"} />
                      <ReviewRow
                        label="Senha"
                        value={form.password ? "••••••••" : "—"}
                      />
                      {form.referral_code.trim() && (
                        <ReviewRow label="Indicação" value={form.referral_code.trim()} />
                      )}
                    </div>
                  )}
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-sm text-red-400"
                  >
                    {error}
                  </motion.p>
                )}

                <div className="mt-8 flex items-center gap-3">
                  {step > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-5"
                      onClick={back}
                      disabled={loading}
                    >
                      Voltar
                    </Button>
                  ) : (
                    <div className="flex-1" />
                  )}
                  <div className="ml-auto flex-1 sm:flex-none">
                    {step < STEPS.length - 1 ? (
                      <Button type="button" className="w-full sm:w-auto sm:min-w-[9.5rem]" onClick={next}>
                        Continuar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className="w-full sm:w-auto sm:min-w-[11rem]"
                        disabled={loading}
                        onClick={() => void submit()}
                      >
                        {loading ? "Criando…" : "Criar conta →"}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassPanel>

        <p className="mt-5 px-2 text-center text-sm text-silver">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-semibold text-lime hover:brightness-110">
            Entrar
          </Link>
        </p>

        {!reduce && (
          <motion.p
            className="mt-6 text-center text-[10px] uppercase tracking-[0.35em] text-white/35"
            animate={{ opacity: [0.25, 0.55, 0.25] }}
            transition={{ duration: 3.2, repeat: Infinity }}
          >
            Desafie · Compita · Vença
          </motion.p>
        )}
      </div>
    </GlassShell>
  );
}

function WizardField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus,
  prefix,
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
  prefix?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm text-silver">
      {label}
      <div className="relative mt-1.5">
        {prefix && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lime">
            {prefix}
          </span>
        )}
        <input
          autoFocus={autoFocus}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-2xl border border-white/15 bg-black/35 py-3.5 text-base text-white outline-none transition focus:border-lime focus:shadow-[0_0_0_3px_rgba(199,240,0,0.15)] sm:text-sm ${
            prefix ? "pl-9 pr-4" : "px-4"
          }`}
        />
      </div>
    </label>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0">
      <span className="text-xs uppercase tracking-wide text-silver">{label}</span>
      <span className="truncate text-sm font-medium text-white">{value}</span>
    </div>
  );
}
