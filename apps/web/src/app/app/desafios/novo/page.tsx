"use client";

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api, type Arena, type Modality } from "@/lib/api";
import { brand } from "@/lib/brand";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/Glass";
import { GlassShell } from "@/components/layout/GlassShell";

type FormState = {
  title: string;
  description: string;
  modality_id: string;
  arena_id: string;
  competition_type: string;
  capacity: number;
  starts_at: string;
  regulation: string;
};

const TYPES = [
  { value: "open", label: "Aberto", hint: "Qualquer um pode entrar" },
  { value: "one_vs_one", label: "1×1", hint: "Duelo direto" },
  { value: "individual", label: "Individual", hint: "Cada um por si" },
  { value: "team", label: "Equipes", hint: "Times na pista" },
  { value: "tournament", label: "Torneio", hint: "Chave / brackets" },
] as const;

const STEPS = [
  {
    id: "ideia",
    kicker: "Essência",
    title: "Qual é o desafio?",
    hint: "Um título marcante e uma descrição curta pra acender a rivalidade.",
  },
  {
    id: "pista",
    kicker: "Pista",
    title: "Onde e em qual modalidade?",
    hint: "Escolhe a modalidade e a arena — só as ativas do MVP.",
  },
  {
    id: "formato",
    kicker: "Formato",
    title: "Como se compete?",
    hint: "Tipo de confronto e quantas vagas no grid.",
  },
  {
    id: "quando",
    kicker: "Agenda",
    title: "Quando largam?",
    hint: "Data e horário do confronto presencial.",
  },
  {
    id: "extra",
    kicker: "Extra",
    title: "Capa e regras",
    hint: "Escolhe um template rápido ou envia tua foto. Regulamento é opcional.",
  },
  {
    id: "go",
    kicker: "Checkered",
    title: "Tudo certo?",
    hint: "Salvamos como rascunho. Para enviar à aprovação, você paga a taxa do desafio na próxima etapa.",
  },
] as const;

const COVER_TEMPLATES = [
  { id: "kart", src: brand.images.kart, label: "Kart racing" },
  { id: "gravity", src: brand.images.gravity, label: "Gravity kart" },
  { id: "challenge", src: brand.images.challenge, label: "O desafio" },
  { id: "winners", src: brand.images.winners, label: "Vencedores" },
  { id: "sunset", src: brand.images.sunset, label: "Complexo sunset" },
  { id: "clubhouse", src: brand.images.clubhouse, label: "Clubhouse" },
] as const;

const ease = [0.22, 1, 0.36, 1] as const;

function defaultStartsAt() {
  return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

async function fileFromTemplate(src: string, name: string): Promise<File> {
  const res = await fetch(src);
  if (!res.ok) throw new Error("template_fetch_failed");
  const blob = await res.blob();
  const type = blob.type || "image/png";
  const ext = type.includes("jpeg") || type.includes("jpg") ? "jpg" : "png";
  return new File([blob], `${name}.${ext}`, { type });
}

export default function NovoDesafioPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const reduce = useReducedMotion();

  const [modalities, setModalities] = useState<Modality[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [bootError, setBootError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverTemplate, setCoverTemplate] = useState<string | null>(COVER_TEMPLATES[0].src);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    modality_id: "",
    arena_id: "",
    competition_type: "open",
    capacity: 8,
    starts_at: defaultStartsAt(),
    regulation: "",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/entrar?next=/app/desafios/novo");
      return;
    }
    Promise.all([api.modalities(), api.arenas()])
      .then(([m, a]) => {
        setModalities(m);
        setArenas(a);
        setForm((f) => ({
          ...f,
          modality_id: f.modality_id || m[0]?.id || "",
          arena_id: f.arena_id || a[0]?.id || "",
        }));
        setReady(true);
      })
      .catch((e) => setBootError(e instanceof Error ? e.message : "erro"));
  }, [authLoading, user, router]);

  useEffect(() => {
    if (coverFile) {
      const url = URL.createObjectURL(coverFile);
      setCoverPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setCoverPreview(coverTemplate);
  }, [coverFile, coverTemplate]);

  const coverLabel = useMemo(() => {
    if (coverFile) return coverFile.name;
    if (coverTemplate) {
      return COVER_TEMPLATES.find((t) => t.src === coverTemplate)?.label || "Template";
    }
    return "Sem capa";
  }, [coverFile, coverTemplate]);

  const progress = ((step + 1) / STEPS.length) * 100;
  const meta = STEPS[step];

  const modalityName = useMemo(
    () => modalities.find((m) => m.id === form.modality_id)?.name || "—",
    [modalities, form.modality_id],
  );
  const arenaName = useMemo(
    () => arenas.find((a) => a.id === form.arena_id)?.name || "—",
    [arenas, form.arena_id],
  );
  const typeLabel = useMemo(
    () => TYPES.find((t) => t.value === form.competition_type)?.label || form.competition_type,
    [form.competition_type],
  );

  const go = useCallback(
    (next: number) => {
      setError(null);
      setDir(next > step ? 1 : -1);
      setStep(next);
    },
    [step],
  );

  function validateStep(i: number): string | null {
    if (i === 0) {
      if (form.title.trim().length < 3) return "Título com pelo menos 3 caracteres.";
      if (form.description.trim().length < 10) {
        return "Conta um pouco mais na descrição (mín. 10 caracteres).";
      }
    }
    if (i === 1) {
      if (!form.modality_id) return "Escolhe uma modalidade.";
      if (!form.arena_id) return "Escolhe uma arena.";
    }
    if (i === 2) {
      if (form.capacity < 2) return "Capacidade mínima: 2 vagas.";
      if (form.capacity > 64) return "Capacidade máxima: 64.";
    }
    if (i === 3) {
      if (!form.starts_at) return "Define data e horário.";
      const when = new Date(form.starts_at);
      if (Number.isNaN(when.getTime())) return "Data inválida.";
      if (when.getTime() < Date.now() + 60 * 60 * 1000) {
        return "Agenda pelo menos 1 hora no futuro.";
      }
    }
    if (i === 4 && coverFile && coverFile.size > 5 * 1024 * 1024) {
      return "Capa até 5MB.";
    }
    if (i === 4 && !coverFile && !coverTemplate) {
      return "Escolhe um template ou envia uma foto.";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    go(Math.min(step + 1, STEPS.length - 1));
  }

  function back() {
    go(Math.max(step - 1, 0));
  }

  async function submit() {
    for (let i = 0; i <= 3; i++) {
      const err = validateStep(i);
      if (err) {
        setError(err);
        go(i);
        return;
      }
    }
    setError(null);
    setLoading(true);
    try {
      let ch = await api.createChallenge({
        title: form.title.trim(),
        description: form.description.trim(),
        modality_id: form.modality_id,
        arena_id: form.arena_id,
        competition_type: form.competition_type,
        regulation: form.regulation.trim(),
        capacity: form.capacity,
        starts_at: new Date(form.starts_at).toISOString(),
      });
      const upload =
        coverFile ||
        (coverTemplate
          ? await fileFromTemplate(
              coverTemplate,
              COVER_TEMPLATES.find((t) => t.src === coverTemplate)?.id || "cover",
            )
          : null);
      if (upload) {
        const asset = await api.uploadMedia(upload, "cover", ch.title);
        ch = await api.setChallengeCover(ch.slug, asset.id);
      }
      setDone(true);
      window.setTimeout(() => router.push(`/desafios/${ch.slug}`), reduce ? 400 : 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "Enter" || e.target instanceof HTMLTextAreaElement) return;
    e.preventDefault();
    if (step < STEPS.length - 1) next();
    else void submit();
  }

  const slide = reduce
    ? { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        enter: { x: dir > 0 ? 56 : -56, opacity: 0, filter: "blur(6px)" },
        center: { x: 0, opacity: 1, filter: "blur(0px)" },
        exit: { x: dir > 0 ? -40 : 40, opacity: 0, filter: "blur(4px)" },
      };

  if (bootError) {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center">
        <p className="text-red-400">{bootError}</p>
        <Button href="/app" className="mt-6">
          Voltar ao hub
        </Button>
      </div>
    );
  }

  if (authLoading || !ready) {
    return <div className="px-6 py-32 text-center text-silver">Preparando o grid…</div>;
  }

  return (
    <GlassShell bg={brand.images.challenge} className="!pt-[4.75rem] md:!pt-24">
      <div className="mx-auto w-full max-w-lg px-1 sm:px-0">
        <div className="mb-4 px-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lime">
              Novo desafio · {step + 1}/{STEPS.length}
            </p>
            <button
              type="button"
              onClick={() => router.push("/app")}
              className="text-[10px] uppercase tracking-wide text-silver hover:text-white"
            >
              Cancelar
            </button>
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
                  <span className="font-display text-2xl">GO</span>
                </motion.div>
                <h2 className="font-display text-4xl text-white sm:text-5xl">Rascunho salvo</h2>
                <p className="mt-2 text-silver">Abrindo a página do desafio…</p>
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
                <h1 className="mt-2 font-display text-[2.15rem] leading-[0.95] tracking-wide text-white sm:text-5xl">
                  {meta.title}
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-silver sm:text-base">{meta.hint}</p>

                <div className="mt-7 space-y-4">
                  {step === 0 && (
                    <>
                      <Field
                        label="Título"
                        autoFocus
                        value={form.title}
                        onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                        placeholder="Ex: Duelo SMK — sexta à noite"
                      />
                      <label className="block text-sm text-silver">
                        Descrição
                        <textarea
                          autoFocus={false}
                          rows={4}
                          value={form.description}
                          placeholder="Quem pode entrar, o clima, o que está em jogo…"
                          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                          className="mt-1.5 w-full rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-base text-white outline-none transition focus:border-lime focus:shadow-[0_0_0_3px_rgba(199,240,0,0.15)] sm:text-sm"
                        />
                      </label>
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <p className="text-xs uppercase tracking-wide text-silver">Modalidade</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {modalities.map((m) => {
                          const on = form.modality_id === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setForm((f) => ({ ...f, modality_id: m.id }))}
                              className={`rounded-2xl border px-4 py-3 text-left transition ${
                                on
                                  ? "border-lime/50 bg-lime/15 text-white"
                                  : "border-white/15 bg-black/25 text-silver hover:border-white/30 hover:text-white"
                              }`}
                            >
                              <span className="block font-semibold">{m.name}</span>
                              <span className="text-xs opacity-70">{m.slug}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="pt-2 text-xs uppercase tracking-wide text-silver">Arena</p>
                      <div className="grid gap-2">
                        {arenas.map((a) => {
                          const on = form.arena_id === a.id;
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => setForm((f) => ({ ...f, arena_id: a.id }))}
                              className={`rounded-2xl border px-4 py-3 text-left transition ${
                                on
                                  ? "border-lime/50 bg-lime/15 text-white"
                                  : "border-white/15 bg-black/25 text-silver hover:border-white/30 hover:text-white"
                              }`}
                            >
                              <span className="block font-semibold">{a.name}</span>
                              <span className="text-xs opacity-70">/{a.slug}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div className="grid gap-2">
                        {TYPES.map((t) => {
                          const on = form.competition_type === t.value;
                          return (
                            <button
                              key={t.value}
                              type="button"
                              onClick={() => setForm((f) => ({ ...f, competition_type: t.value }))}
                              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                                on
                                  ? "border-lime/50 bg-lime/15 text-white"
                                  : "border-white/15 bg-black/25 text-silver hover:border-white/30 hover:text-white"
                              }`}
                            >
                              <span>
                                <span className="block font-semibold">{t.label}</span>
                                <span className="text-xs opacity-70">{t.hint}</span>
                              </span>
                              {on && <span className="text-lime">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                      <label className="block text-sm text-silver">
                        Vagas no grid
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            type="button"
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-xl text-white hover:border-lime"
                            onClick={() =>
                              setForm((f) => ({ ...f, capacity: Math.max(2, f.capacity - 1) }))
                            }
                          >
                            −
                          </button>
                          <span className="min-w-[3rem] text-center font-display text-4xl text-white">
                            {form.capacity}
                          </span>
                          <button
                            type="button"
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-xl text-white hover:border-lime"
                            onClick={() =>
                              setForm((f) => ({ ...f, capacity: Math.min(64, f.capacity + 1) }))
                            }
                          >
                            +
                          </button>
                        </div>
                      </label>
                    </>
                  )}

                  {step === 3 && (
                    <Field
                      label="Data e horário"
                      type="datetime-local"
                      autoFocus
                      value={form.starts_at}
                      onChange={(v) => setForm((f) => ({ ...f, starts_at: v }))}
                    />
                  )}

                  {step === 4 && (
                    <>
                      <p className="text-xs uppercase tracking-wide text-silver">
                        Escolhe um template
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {COVER_TEMPLATES.map((t) => {
                          const on = !coverFile && coverTemplate === t.src;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setCoverFile(null);
                                setCoverTemplate(t.src);
                              }}
                              className={`group relative overflow-hidden rounded-2xl border text-left transition ${
                                on
                                  ? "border-lime shadow-[0_0_0_1px_rgba(199,240,0,0.5)]"
                                  : "border-white/15 hover:border-white/35"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={t.src}
                                alt={t.label}
                                className="aspect-[4/3] w-full object-cover"
                              />
                              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-racing/90 to-transparent px-2 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-wide text-white">
                                {t.label}
                              </span>
                              {on && (
                                <span className="absolute right-2 top-2 rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold text-racing">
                                  OK
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="relative py-1 text-center text-[10px] uppercase tracking-[0.25em] text-silver">
                        <span className="bg-transparent px-2">ou envia a tua</span>
                      </div>

                      <label className="block text-sm text-silver">
                        Upload (jpg/png/webp, máx. 5MB)
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setCoverFile(file);
                            if (file) setCoverTemplate(null);
                          }}
                          className="mt-2 block w-full text-sm text-silver file:mr-3 file:rounded-full file:border-0 file:bg-lime file:px-4 file:py-2 file:font-semibold file:text-racing"
                        />
                      </label>

                      {coverPreview && (
                        <div>
                          <p className="mb-1.5 text-xs text-silver">Prévia</p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={coverPreview}
                            alt="Prévia da capa"
                            className="h-36 w-full rounded-2xl object-cover"
                          />
                        </div>
                      )}

                      <label className="block text-sm text-silver">
                        Regulamento (opcional)
                        <textarea
                          rows={3}
                          value={form.regulation}
                          placeholder="Regras, no-shows, como desempatar…"
                          onChange={(e) => setForm((f) => ({ ...f, regulation: e.target.value }))}
                          className="mt-1.5 w-full rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-base text-white outline-none transition focus:border-lime focus:shadow-[0_0_0_3px_rgba(199,240,0,0.15)] sm:text-sm"
                        />
                      </label>
                    </>
                  )}

                  {step === 5 && (
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-4">
                      <ReviewRow label="Título" value={form.title} />
                      <ReviewRow label="Modalidade" value={modalityName} />
                      <ReviewRow label="Arena" value={arenaName} />
                      <ReviewRow label="Formato" value={`${typeLabel} · ${form.capacity} vagas`} />
                      <ReviewRow
                        label="Quando"
                        value={new Date(form.starts_at).toLocaleString("pt-BR")}
                      />
                      <ReviewRow label="Capa" value={coverLabel} />
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
                    <Button type="button" variant="ghost" className="!px-5" onClick={back} disabled={loading}>
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
                        {loading ? "Salvando…" : "Salvar rascunho →"}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassPanel>
      </div>
    </GlassShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block text-sm text-silver">
      {label}
      <input
        autoFocus={autoFocus}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-2xl border border-white/15 bg-black/35 px-4 py-3.5 text-base text-white outline-none transition focus:border-lime focus:shadow-[0_0_0_3px_rgba(199,240,0,0.15)] sm:text-sm"
      />
    </label>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0">
      <span className="text-xs uppercase tracking-wide text-silver">{label}</span>
      <span className="truncate text-right text-sm font-medium text-white">{value}</span>
    </div>
  );
}
