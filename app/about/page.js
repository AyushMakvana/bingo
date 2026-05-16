export default function About() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl">
        <p className="text-sm font-bold uppercase text-emerald-700">About</p>
        <h1 className="mt-3 text-4xl font-black tracking-normal text-slate-950">
          A fast two-player Bingo table
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">
          This site is built for a simple shared-screen Bingo match. Each player
          creates a personal 5x5 number board, then both boards react to every
          number called during the game.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {["5x5 setup", "Turn based calls", "BINGO scoring"].map((item) => (
            <div className="rounded-lg border border-slate-200 bg-white p-5" key={item}>
              <h2 className="text-lg font-bold text-slate-950">{item}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Designed to keep the game clear, quick, and easy to follow.
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
