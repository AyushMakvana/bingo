import GuessWordGame from "./guess-word-game";

export default function GuessWordPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase text-amber-600">
            Two-player word game
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-normal text-slate-950 sm:text-5xl">
            Guess Word
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            One player guesses a short secret word. The other player sees the word
            and can only answer yes, no, or maybe.
          </p>
        </div>
      </section>
      <GuessWordGame />
    </main>
  );
}
