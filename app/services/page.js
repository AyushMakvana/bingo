export default function Services() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase text-emerald-700">Services</p>
        <h1 className="mt-3 text-4xl font-black tracking-normal text-slate-950">
          Game features
        </h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            "Create a two-player lobby",
            "Fill both boards from 1 to 25",
            "Mark called numbers on both boards",
            "Track rows, columns, diagonals, and winner",
          ].map((feature) => (
            <div className="rounded-lg border border-slate-200 bg-white p-5" key={feature}>
              <h2 className="text-xl font-bold text-slate-950">{feature}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Built with Next.js, Tailwind CSS, and shadcn-style interface
                components.
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
