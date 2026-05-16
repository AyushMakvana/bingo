"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase text-red-700">Page Error</p>
        <h1 className="mt-3 text-3xl font-black tracking-normal text-slate-950">
          Something broke while loading Bingo
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {error?.message || "Clear the saved game session and try again."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={reset} type="button">
            Try Again
          </Button>
          <Button
            onClick={() => {
              window.localStorage.removeItem("bingo-current-player-session");
              window.location.href = "/";
            }}
            type="button"
            variant="outline"
          >
            Clear Saved Game
          </Button>
        </div>
      </section>
    </main>
  );
}
