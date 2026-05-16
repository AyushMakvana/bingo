const BOARD_SIZE = 25;
const EMPTY_BOARD = Array.from({ length: BOARD_SIZE }, () => null);

export const dynamic = "force-dynamic";

function getStore() {
  if (!globalThis.bingoLobbyStore) {
    globalThis.bingoLobbyStore = new Map();
  }

  return globalThis.bingoLobbyStore;
}

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

function json(data, init) {
  return Response.json(data, init);
}

export async function GET(request) {
  const code = normalizeCode(new URL(request.url).searchParams.get("code"));
  const lobby = getStore().get(code);

  if (!lobby) {
    return json({ error: "No lobby found with that code." }, { status: 404 });
  }

  return json({ lobby });
}

export async function POST(request) {
  const store = getStore();
  const body = await request.json();
  const action = body.action;

  if (action === "create") {
    const playerName = String(body.playerName ?? "").trim();

    if (!playerName) {
      return json({ error: "Enter your player name first." }, { status: 400 });
    }

    let code = createLobbyCode();
    while (store.has(code)) {
      code = createLobbyCode();
    }

    const lobby = createEmptyLobby(code, playerName);
    store.set(code, lobby);

    return json({ lobby, playerIndex: 0 });
  }

  if (action === "join") {
    const code = normalizeCode(body.code);
    const playerName = String(body.playerName ?? "").trim();
    const lobby = store.get(code);

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

    store.set(code, updatedLobby);

    return json({ lobby: updatedLobby, playerIndex: 1 });
  }

  if (action === "update") {
    const code = normalizeCode(body.code);
    const lobby = body.lobby;

    if (!code || !lobby || lobby.code !== code) {
      return json({ error: "Invalid lobby update." }, { status: 400 });
    }

    if (!store.has(code)) {
      return json({ error: "No lobby found with that code." }, { status: 404 });
    }

    store.set(code, lobby);

    return json({ lobby });
  }

  if (action === "close") {
    const code = normalizeCode(body.code);
    store.delete(code);

    return json({ ok: true });
  }

  return json({ error: "Unsupported lobby action." }, { status: 400 });
}
