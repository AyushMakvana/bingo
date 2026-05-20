"use client";

import { useState } from "react";

const CONTACT_EMAIL = "ayushmakvana02@gmail.com";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function sendMessage(event) {
    event.preventDefault();

    const subject = encodeURIComponent("New Bingo Contact Message");
    const body = encodeURIComponent(
      [`Name: ${name}`, `Email: ${email}`, "", message].join("\n"),
    );

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <form
      className="mt-8 grid gap-4 rounded-lg border border-slate-200 bg-white p-5"
      onSubmit={sendMessage}
    >
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Name
        <input
          className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          required
          value={name}
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Email
        <input
          className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Your email"
          required
          type="email"
          value={email}
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Message
        <textarea
          className="min-h-32 rounded-md border border-slate-300 p-3 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Tell us what you want to improve"
          required
          value={message}
        />
      </label>
      <button
        className="h-11 rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
        type="submit"
      >
        Send Message
      </button>
      <p className="text-sm leading-6 text-slate-600">
        This opens your email app with the message addressed to {CONTACT_EMAIL}.
      </p>
    </form>
  );
}
