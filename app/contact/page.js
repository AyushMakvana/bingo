export default function Contact() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-bold uppercase text-emerald-700">Contact</p>
        <h1 className="mt-3 text-4xl font-black tracking-normal text-slate-950">
          Contact
        </h1>
        <form className="mt-8 grid gap-4 rounded-lg border border-slate-200 bg-white p-5">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Name
            <input
              className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Your name"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Message
            <textarea
              className="min-h-32 rounded-md border border-slate-300 p-3 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Tell us what you want to improve"
            />
          </label>
          <button
            className="h-11 rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            type="button"
          >
            Send Message
          </button>
        </form>
      </section>
    </main>
  );
}
