const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL ?? "ayushmakvana02@gmail.com";
const RESEND_API_URL = "https://api.resend.com/emails";
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Bingo Contact <onboarding@resend.dev>";

export const dynamic = "force-dynamic";

function json(data, init) {
  return Response.json(data, init);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function readResendError(response) {
  const text = await response.text();

  try {
    const data = JSON.parse(text);
    return data.message || data.error?.message || data.error || text;
  } catch {
    return text || "Resend could not send the email.";
  }
}

export async function POST(request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return json(
        { error: "RESEND_API_KEY is not configured on the server." },
        { status: 500 },
      );
    }

    const { name, email, message } = await request.json();
    const trimmedName = String(name ?? "").trim();
    const trimmedEmail = String(email ?? "").trim();
    const trimmedMessage = String(message ?? "").trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      return json({ error: "Name, email, and message are required." }, { status: 400 });
    }

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [CONTACT_TO_EMAIL],
        reply_to: trimmedEmail,
        subject: "New Bingo Contact Message",
        html: [
          "<h2>New Bingo Contact Message</h2>",
          `<p><strong>Name:</strong> ${escapeHtml(trimmedName)}</p>`,
          `<p><strong>Email:</strong> ${escapeHtml(trimmedEmail)}</p>`,
          `<p><strong>Message:</strong></p>`,
          `<p>${escapeHtml(trimmedMessage).replaceAll("\n", "<br />")}</p>`,
        ].join(""),
      }),
    });

    if (!response.ok) {
      return json({ error: await readResendError(response) }, { status: 502 });
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
}
