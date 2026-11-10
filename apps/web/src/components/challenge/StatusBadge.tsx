const labels: Record<string, string> = {
  draft: "Rascunho",
  pending_approval: "Em aprovação",
  published: "Publicado",
  in_progress: "Em andamento",
  completed: "Finalizado",
  cancelled: "Cancelado",
  disputed: "Em disputa",
};

export function StatusBadge({
  status,
  derived,
}: {
  status: string;
  derived?: { open?: boolean; full?: boolean; scheduled?: boolean };
}) {
  let text = labels[status] || status;
  if (status === "published" && derived?.full) text = "Esgotado";
  else if (status === "published" && derived?.open) text = "Vagas abertas";
  else if (status === "published" && derived?.scheduled) text = "Agendado";

  return (
    <span className="inline-flex rounded-sm border border-lime/40 bg-lime/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-lime">
      {text}
    </span>
  );
}
