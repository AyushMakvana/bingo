const FIREBASE_DATABASE_URL =
  process.env.FIREBASE_DATABASE_URL ??
  "https://bingo-d0bf7-default-rtdb.firebaseio.com";

const WORDS = [
  "rice",
  "cake",
  "milk",
  "egg",
  "tea",
  "cat",
  "dog",
  "cow",
  "hen",
  "owl",
  "bee",
  "ant",
  "pen",
  "cup",
  "key",
  "bag",
  "soap",
  "lamp",
  "fan",
  "book",
  "shoe",
  "ball",
];

export const dynamic = "force-dynamic";

function createLobbyCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function normalizeCode(code) {
  return String(code ?? "").trim().toUpperCase();
}

function pickWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function getLobbyUrl(code) {
  return `${FIREBASE_DATABASE_URL.replace(/\/$/, "")}/wordLobbies/${code}.json`;
}

function json(data, init) {
  return Response.json(data, init);
}

function getFirebaseError(data, fallback) {
  if (typeof data?.error === "string") {
    return data.error;
  }

  return data?.error?.message ?? fallback;
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => value[key]);
  }

  return [];
}

function createEmptyLobby(code, playerName, creatorRole) {
  const creatorIsGuesser = creatorRole === "guesser";

  return {
    code,
    word: pickWord(),
    players: [
      {
        name: playerName,
        joined: true,
        role: creatorIsGuesser ? "guesser" : "answerer",
      },
      {
        name: "",
        joined: false,
        role: creatorIsGuesser ? "answerer" : "guesser",
      },
    ],
    messages: [],
    status: "playing",
    winnerIndex: null,
    round: 1,
  };
}

function normalizeLobby(lobby, fallbackCode = "") {
  if (!lobby || typeof lobby !== "object") {
    return null;
  }

  const players = toArray(lobby.players);
  const firstRole = players[0]?.role === "answerer" ? "answerer" : "guesser";
  const secondRole = firstRole === "guesser" ? "answerer" : "guesser";

  return {
    code: normalizeCode(lobby.code || fallbackCode),
    word: String(lobby.word || pickWord()).toLowerCase().slice(0, 4),
    players: [
      {
        name: String(players[0]?.name ?? ""),
        joined: Boolean(players[0]?.joined),
        role: firstRole,
      },
      {
        name: String(players[1]?.name ?? ""),
        joined: Boolean(players[1]?.joined),
        role: secondRole,
      },
    ],
    messages: toArray(lobby.messages).map((message, index) => ({
      id: String(message?.id ?? `${index}`),
      from: Number(message?.from) === 1 ? 1 : 0,
      text: String(message?.text ?? ""),
      answer: ["yes", "no", "maybe"].includes(message?.answer)
        ? message.answer
        : "",
    })),
    status: lobby.status === "won" ? "won" : "playing",
    winnerIndex:
      Number(lobby.winnerIndex) === 0 || Number(lobby.winnerIndex) === 1
        ? Number(lobby.winnerIndex)
        : null,
    round: Number(lobby.round) >= 1 ? Number(lobby.round) : 1,
  };
}

async function readLobby(code) {
  if (!code) {
    return null;
  }

  const response = await fetch(getLobbyUrl(code), { cache: "no-store" });

  if (response.status === 404) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(getFirebaseError(data, "Could not read lobby."));
  }

  return normalizeLobby(data, code);
}

async function writeLobby(lobby) {
  const normalizedLobby = normalizeLobby(lobby, lobby.code);
  const response = await fetch(getLobbyUrl(normalizedLobby.code), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...normalizedLobby,
      updatedAt: Date.now(),
    }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(getFirebaseError(data, "Could not save lobby."));
  }
}

async function deleteLobby(code) {
  const response = await fetch(getLobbyUrl(code), { method: "DELETE" });

  if (response.status === 404) {
    return;
  }

  if (!response.ok) {
    const data = await response.json();
    throw new Error(getFirebaseError(data, "Could not close lobby."));
  }
}

export async function GET(request) {
  try {
    const code = normalizeCode(new URL(request.url).searchParams.get("code"));
    const lobby = await readLobby(code);

    if (!lobby) {
      return json({ error: "No lobby found with that code." }, { status: 404 });
    }

    return json({ lobby });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === "create") {
      const playerName = String(body.playerName ?? "").trim();
      const creatorRole = body.creatorRole === "answerer" ? "answerer" : "guesser";

      if (!playerName) {
        return json({ error: "Enter your player name first." }, { status: 400 });
      }

      let code = createLobbyCode();
      while (await readLobby(code)) {
        code = createLobbyCode();
      }

      const lobby = createEmptyLobby(code, playerName, creatorRole);
      await writeLobby(lobby);

      return json({ lobby, playerIndex: 0 });
    }

    if (action === "join") {
      const code = normalizeCode(body.code);
      const playerName = String(body.playerName ?? "").trim();
      const lobby = await readLobby(code);

      if (!playerName) {
        return json({ error: "Enter your player name first." }, { status: 400 });
      }

      if (!lobby) {
        return json({ error: "No lobby found with that code." }, { status: 404 });
      }

      if (lobby.players[1].joined) {
        return json({ error: "That lobby already has two players." }, { status: 409 });
      }

      const updatedLobby = {
        ...lobby,
        players: [lobby.players[0], { ...lobby.players[1], name: playerName, joined: true }],
      };

      await writeLobby(updatedLobby);

      return json({ lobby: updatedLobby, playerIndex: 1 });
    }

    if (action === "update") {
      const code = normalizeCode(body.code);
      const lobby = body.lobby;

      if (!code || !lobby || normalizeCode(lobby.code) !== code) {
        return json({ error: "Invalid lobby update." }, { status: 400 });
      }

      if (!(await readLobby(code))) {
        return json({ error: "No lobby found with that code." }, { status: 404 });
      }

      await writeLobby(lobby);

      return json({ lobby: normalizeLobby(lobby, code) });
    }

    if (action === "new-round") {
      const code = normalizeCode(body.code);
      const lobby = await readLobby(code);

      if (!lobby) {
        return json({ error: "No lobby found with that code." }, { status: 404 });
      }

      const updatedLobby = {
        ...lobby,
        word: pickWord(),
        messages: [],
        status: "playing",
        winnerIndex: null,
        round: lobby.round + 1,
      };

      await writeLobby(updatedLobby);

      return json({ lobby: updatedLobby });
    }

    if (action === "close") {
      const code = normalizeCode(body.code);
      await deleteLobby(code);

      return json({ ok: true });
    }

    return json({ error: "Unsupported lobby action." }, { status: 400 });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
}
