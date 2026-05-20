import ContactForm from "./contact-form";

export default function Contact() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-bold uppercase text-emerald-700">Contact</p>
        <h1 className="mt-3 text-4xl font-black tracking-normal text-slate-950">
          Contact
        </h1>
        <ContactForm />
      </section>
    </main>
  );
}
