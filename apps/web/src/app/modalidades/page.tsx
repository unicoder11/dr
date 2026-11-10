export const metadata = { title: "Modalidades" };

const items = [
  {
    title: "Super Mountain Kart",
    body: "Karts elétricos, curvas de montanha e ultrapassagens.",
  },
  {
    title: "Gravity Kart",
    body: "Descidas sem propulsão própria em baterias coletivas.",
  },
];

export default function ModalidadesPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-28">
      <h1 className="font-display text-5xl text-white">Modalidades</h1>
      <p className="mt-3 text-silver">Ativas no MVP. Arquitetura pronta para expandir.</p>
      <ul className="mt-10 space-y-6">
        {items.map((m) => (
          <li key={m.title} className="border-l-2 border-lime pl-5">
            <h2 className="font-display text-2xl text-white">{m.title}</h2>
            <p className="mt-1 text-silver">{m.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
