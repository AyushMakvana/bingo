import BingoGame from "../bingo-game";

export default function BingoPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold uppercase text-emerald-700">
              Online style, same-screen play
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-normal text-slate-950 sm:text-5xl">
              Bingo
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Make a two-player lobby, build custom 5x5 boards, call numbers by
              turn, and race to complete BINGO first.
            </p>
          </div>
          <div className="grid grid-cols-5 gap-2 self-center">
            {"BINGO".split("").map((letter) => (
              <div
                className="flex aspect-square items-center justify-center rounded-md bg-emerald-600 text-3xl font-black text-white shadow-sm"
                key={letter}
              >
                {letter}
              </div>
            ))}
          </div>
        </div>
      </section>
      <BingoGame />
    </main>
  );
}
