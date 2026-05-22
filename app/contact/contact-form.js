"use client";

import { useState } from "react";

const CONTACT_EMAIL = "ayushmakvana02@gmail.com";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle");
  const [notice, setNotice] = useState("");

  async function sendMessage(event) {
    event.preventDefault();
    setStatus("sending");
    setNotice("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Message could not be sent.");
      }

      setName("");
      setEmail("");
      setMessage("");
      setStatus("sent");
      setNotice("Message sent. Check your inbox.");
    } catch (error) {
      setStatus("error");
      setNotice(error.message);
    }
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
        disabled={status === "sending"}
        type="submit"
      >
        {status === "sending" ? "Sending..." : "Send Message"}
      </button>
      {notice ? (
        <p
          className={[
            "rounded-md px-4 py-3 text-sm font-semibold",
            status === "error"
              ? "bg-red-100 text-red-800"
              : "bg-emerald-100 text-emerald-800",
          ].join(" ")}
        >
          {notice}
        </p>
      ) : (
        <p className="text-sm leading-6 text-slate-600">
          Messages are sent securely to {CONTACT_EMAIL}.
        </p>
      )}
    </form>
  );
}
