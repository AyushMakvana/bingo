const BOARD_SIZE = 25;
const EMPTY_BOARD = Array.from({ length: BOARD_SIZE }, () => null);
const FIREBASE_DATABASE_URL =
  process.env.FIREBASE_DATABASE_URL ??
  "https://bingo-d0bf7-default-rtdb.firebaseio.com";

export const dynamic = "force-dynamic";

function createLobbyCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function normalizeCode(code) {
  return String(code ?? "").trim().toUpperCase();
}

function createEmptyLobby(code, playerName) {
  return {
    code,
    players: [
      { name: playerName, joined: true },
      { name: "", joined: false },
    ],
    boards: [EMPTY_BOARD, EMPTY_BOARD],
    nextNumbers: [1, 1],
    calledNumbers: [],
    turn: 0,
  };
}

function toArray(value, length, fallbackValue = null) {
  const source = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.keys(value)
          .sort((a, b) => Number(a) - Number(b))
          .map((key) => value[key])
      : [];

  return Array.from({ length }, (_, index) =>
    source[index] === undefined ? fallbackValue : source[index],
  );
}

function normalizeBoard(board) {
  return toArray(board, BOARD_SIZE).map((cell) =>
    Number(cell) >= 1 && Number(cell) <= 25 ? Number(cell) : null,
  );
}

function normalizeLobby(lobby, fallbackCode = "") {
  if (!lobby || typeof lobby !== "object") {
    return null;
  }

  const players = toArray(lobby.players, 2, { name: "", joined: false }).map(
    (player) => ({
      name: String(player?.name ?? ""),
      joined: Boolean(player?.joined),
    }),
  );

  return {
    code: normalizeCode(lobby.code || fallbackCode),
    players,
    boards: [
      normalizeBoard(lobby.boards?.[0] ?? lobby.boards?.["0"]),
      normalizeBoard(lobby.boards?.[1] ?? lobby.boards?.["1"]),
    ],
    nextNumbers: toArray(lobby.nextNumbers, 2, 1).map((number) =>
      Number(number) >= 1 && Number(number) <= 25 ? Number(number) : 1,
    ),
    calledNumbers: toArray(lobby.calledNumbers, 25)
      .map((number) => Number(number))
      .filter((number) => number >= 1 && number <= 25),
    turn: Number(lobby.turn) === 1 ? 1 : 0,
  };
}

function serializeLobby(lobby) {
  return {
    ...lobby,
    boards: lobby.boards.map((board) => board.map((cell) => cell ?? 0)),
  };
}

function json(data, init) {
  return Response.json(data, init);
}

function getLobbyUrl(code) {
  return `${FIREBASE_DATABASE_URL.replace(/\/$/, "")}/lobbies/${code}.json`;
}

async function readLobby(code) {
  if (!code) {
    return null;
  }

  const response = await fetch(getLobbyUrl(code), {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Could not read lobby.");
  }

  return normalizeLobby(data, code);
}

async function writeLobby(lobby) {
  const lobbyToSave = serializeLobby(normalizeLobby(lobby, lobby.code));
  const response = await fetch(getLobbyUrl(lobby.code), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...lobbyToSave,
      updatedAt: Date.now(),
    }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Could not save lobby.");
  }
}

async function deleteLobby(code) {
  const response = await fetch(getLobbyUrl(code), {
    method: "DELETE",
  });

  if (response.status === 404) {
    return;
  }

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error?.message ?? "Could not close lobby.");
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

      if (!playerName) {
        return json({ error: "Enter your player name first." }, { status: 400 });
      }

      let code = createLobbyCode();
      while (await readLobby(code)) {
        code = createLobbyCode();
      }

      const lobby = createEmptyLobby(code, playerName);
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
        players: [lobby.players[0], { name: playerName, joined: true }],
      };

      await writeLobby(updatedLobby);

      return json({ lobby: updatedLobby, playerIndex: 1 });
    }

    if (action === "update") {
      const code = normalizeCode(body.code);
      const lobby = body.lobby;

      if (!code || !lobby || lobby.code !== code) {
        return json({ error: "Invalid lobby update." }, { status: 400 });
      }

      if (!(await readLobby(code))) {
        return json({ error: "No lobby found with that code." }, { status: 404 });
      }

      await writeLobby(lobby);

      return json({ lobby });
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
