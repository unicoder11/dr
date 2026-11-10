export const metadata = { title: "Como funciona" };

export default function ComoFuncionaPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-28">
      <h1 className="font-display text-5xl text-white">Como funciona</h1>
      <ol className="mt-8 list-decimal space-y-4 pl-5 text-silver">
        <li>Crie sua conta e complete o perfil.</li>
        <li>Explore desafios de kart e gravity na Super Mountain Kart.</li>
        <li>Inscreva-se ou reserve uma experiência presencial.</li>
        <li>Faça check-in, compete e veja o resultado no ranking.</li>
      </ol>
    </div>
  );
}
