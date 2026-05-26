import Link from "next/link";

const games = [
  {
    href: "/bingo",
    title: "Bingo",
    description:
      "Build private 5x5 boards, call numbers by turn, and race to complete BINGO first.",
    label: "Numbers",
    accent: "bg-emerald-600",
    preview: ["B", "I", "N", "G", "O"],
  },
  {
    href: "/guess-word",
    title: "Guess Word",
    description:
      "One player guesses a short secret word while the other can only answer yes, no, or maybe.",
    label: "Words",
    accent: "bg-amber-500",
    preview: ["?", "Y", "N", "M"],
  },
];

const guessWordPreview = ["GUESS"];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase text-emerald-700">
            Two-player web games
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-normal text-slate-950 sm:text-5xl">
            Choose a game
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Create a lobby, share the code, and play quick two-player games online.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-8 sm:px-6 md:grid-cols-2 lg:px-8">
        {games.map((game) => (
          <Link
            className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
            href={game.href}
            key={game.href}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">
                  {game.label}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-normal text-slate-950">
                  {game.title}
                </h2>
              </div>
              {game.href === "/guess-word" ? (
                <div className="grid gap-1">
                  {guessWordPreview.map((word) => (
                    <div className="flex gap-1" key={word}>
                      {word.split("").map((letter, index) => (
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-500 text-lg font-black text-white"
                          key={`${word}-${letter}-${index}`}
                        >
                          {letter}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex gap-1">
                  {game.preview.map((item) => (
                    <span
                      className={[
                        "flex h-10 w-10 items-center justify-center rounded-md text-lg font-black text-white",
                        game.accent,
                      ].join(" ")}
                      key={item}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
              {game.description}
            </p>
            <span className="mt-6 inline-flex h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition group-hover:bg-emerald-700">
              Play {game.title}
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
