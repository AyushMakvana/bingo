const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL ?? "ayushmakvana02@gmail.com";
const MAILSLURP_API_URL = "https://api.mailslurp.com/emails";

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

async function readMailSlurpError(response) {
  const text = await response.text();

  try {
    const data = JSON.parse(text);
    return data.message || data.error || text;
  } catch {
    return text || "MailSlurp could not send the email.";
  }
}

export async function POST(request) {
  try {
    const apiKey = process.env.MAILSLURP_API_KEY;

    if (!apiKey) {
      return json(
        { error: "MAILSLURP_API_KEY is not configured on the server." },
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

    const url = new URL(MAILSLURP_API_URL);

    if (process.env.MAILSLURP_INBOX_ID) {
      url.searchParams.set("inboxId", process.env.MAILSLURP_INBOX_ID);
    } else {
      url.searchParams.set("useDomainPool", "true");
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        to: [CONTACT_TO_EMAIL],
        replyTo: trimmedEmail,
        subject: "New Bingo Contact Message",
        isHTML: true,
        body: [
          "<h2>New Bingo Contact Message</h2>",
          `<p><strong>Name:</strong> ${escapeHtml(trimmedName)}</p>`,
          `<p><strong>Email:</strong> ${escapeHtml(trimmedEmail)}</p>`,
          `<p><strong>Message:</strong></p>`,
          `<p>${escapeHtml(trimmedMessage).replaceAll("\n", "<br />")}</p>`,
        ].join(""),
      }),
    });

    if (!response.ok) {
      return json({ error: await readMailSlurpError(response) }, { status: 502 });
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
}
