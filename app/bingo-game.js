"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const BOARD_SIZE = 5;
const NUMBERS = Array.from({ length: 25 }, (_, index) => index + 1);
const LETTERS = ["B", "I", "N", "G", "O"];
const SESSION_KEY = "bingo-current-player-session";

function getCompletedLines(board, calledNumbers) {
  const called = new Set(calledNumbers);
  const lines = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    lines.push(
      Array.from(
        { length: BOARD_SIZE },
        (_, col) => row * BOARD_SIZE + col,
      ),
    );
  }

  for (let col = 0; col < BOARD_SIZE; col += 1) {
    lines.push(Array.from({ length: BOARD_SIZE }, (_, row) => row * BOARD_SIZE + col));
  }

  lines.push(Array.from({ length: BOARD_SIZE }, (_, index) => index * BOARD_SIZE + index));
  lines.push(
    Array.from(
      { length: BOARD_SIZE },
      (_, index) => index * BOARD_SIZE + (BOARD_SIZE - 1 - index),
    ),
  );

  return lines.filter((line) =>
    line.every((cellIndex) => board[cellIndex] && called.has(board[cellIndex])),
  ).length;
}

async function apiRequest(body) {
  const response = await fetch("/api/lobbies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const data = parseApiResponse(text);

  if (!response.ok) {
    throw new Error(data.error ?? "Something went wrong.");
  }

  return data;
}

async function fetchLobby(code) {
  const response = await fetch(`/api/lobbies?code=${encodeURIComponent(code)}`, {
    cache: "no-store",
  });
  const text = await response.text();
  const data = parseApiResponse(text);

  if (!response.ok) {
    throw new Error(data.error ?? "No lobby found with that code.");
  }

  return data.lobby;
}

function parseApiResponse(text) {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 160) };
  }
}

function Input({ className = "", ...props }) {
  return (
    <input
      className={[
        "h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none",
        "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

function Board({ board, calledNumbers, onCellClick, setupMode, title, active }) {
  const called = new Set(calledNumbers);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        <span
          className={[
            "rounded-full px-3 py-1 text-xs font-semibold",
            active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600",
          ].join(" ")}
        >
          {active ? "Your turn" : "Waiting"}
        </span>
      </div>
      <div className="mx-auto grid aspect-square w-full max-w-[390px] grid-cols-5 gap-1.5">
        {board.map((number, index) => {
          const marked = number && called.has(number);

          return (
            <button
              className={[
                "flex min-h-10 items-center justify-center rounded-md border text-sm font-bold transition sm:text-base",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                marked
                  ? "border-emerald-700 bg-emerald-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-900 hover:border-emerald-400 hover:bg-emerald-50",
                setupMode && !number ? "border-dashed border-slate-300" : "",
              ].join(" ")}
              disabled={!setupMode || Boolean(number)}
              key={index}
              onClick={() => onCellClick(index)}
              type="button"
            >
              {number ?? ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BingoLetters({ count }) {
  return (
    <div className="flex gap-2">
      {LETTERS.map((letter, index) => (
        <span
          className={[
            "flex h-10 w-10 items-center justify-center rounded-md border text-lg font-black",
            index < count
              ? "border-amber-500 bg-amber-300 text-slate-950"
              : "border-slate-200 bg-white text-slate-300",
          ].join(" ")}
          key={letter}
        >
          {letter}
        </span>
      ))}
    </div>
  );
}

function getSavedPlayerSessionSnapshot() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(SESSION_KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribeToSavedSession(callback) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", callback);
  window.addEventListener("bingo-session-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("bingo-session-change", callback);
  };
}

function parseSavedPlayerSession(savedSession) {
  if (!savedSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(savedSession);

    if (parsedSession?.playerName) {
      const savedPlayerIndex = parsedSession.session?.playerIndex;
      const savedSession =
        parsedSession.session?.code &&
        (savedPlayerIndex === 0 || savedPlayerIndex === 1)
          ? parsedSession.session
          : null;

      return {
        playerName: parsedSession.playerName,
        session: savedSession,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function savePlayerSession(playerName, session) {
  try {
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        playerName,
        session,
      }),
    );
    window.dispatchEvent(new Event("bingo-session-change"));
  } catch {
    // Storage can be unavailable in strict browser privacy modes.
  }
}

function removeSavedPlayerSession() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event("bingo-session-change"));
  } catch {
    // Storage can be unavailable in strict browser privacy modes.
  }
}

function isValidLobby(lobby) {
  return (
    lobby &&
    typeof lobby.code === "string" &&
    Array.isArray(lobby.players) &&
    lobby.players.length === 2 &&
    Array.isArray(lobby.boards) &&
    lobby.boards.length === 2 &&
    lobby.boards.every((board) => Array.isArray(board) && board.length === 25) &&
    Array.isArray(lobby.nextNumbers) &&
    lobby.nextNumbers.length === 2 &&
    Array.isArray(lobby.calledNumbers) &&
    (lobby.winnerIndex === null ||
      lobby.winnerIndex === undefined ||
      lobby.winnerIndex === 0 ||
      lobby.winnerIndex === 1)
  );
}

export default function BingoGame() {
  const savedPlayerSessionSnapshot = useSyncExternalStore(
    subscribeToSavedSession,
    getSavedPlayerSessionSnapshot,
    () => "",
  );
  const savedPlayerSession = useMemo(
    () => parseSavedPlayerSession(savedPlayerSessionSnapshot),
    [savedPlayerSessionSnapshot],
  );
  const [playerName, setPlayerName] = useState("");
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");
  const [session, setSession] = useState(null);
  const [lobby, setLobby] = useState(null);
  const optimisticPendingRef = useRef(false);

  const activeSession = session ?? savedPlayerSession?.session ?? null;
  const activePlayerName = playerName || savedPlayerSession?.playerName || "";
  const hasConfirmedName = nameConfirmed || Boolean(savedPlayerSession?.playerName);
  const playerIndex =
    activeSession?.playerIndex === 0 || activeSession?.playerIndex === 1
      ? activeSession.playerIndex
      : -1;
  const opponentIndex = playerIndex === 0 ? 1 : 0;
  const currentBoard = playerIndex >= 0 ? lobby?.boards[playerIndex] : null;
  const currentPlayer = playerIndex >= 0 ? lobby?.players[playerIndex] : null;
  const opponent = playerIndex >= 0 ? lobby?.players[opponentIndex] : null;
  const lobbyReady = Boolean(lobby?.players.every((player) => player.joined));
  const ownSetupComplete = Boolean(currentBoard?.every(Boolean));
  const setupComplete = Boolean(lobby?.boards.every((board) => board.every(Boolean)));

  const scores = useMemo(
    () =>
      lobby
        ? lobby.boards.map((board) =>
            Math.min(getCompletedLines(board, lobby.calledNumbers), 5),
          )
        : [0, 0],
    [lobby],
  );
  const winnerIndex =
    (lobby?.winnerIndex === 0 || lobby?.winnerIndex === 1) &&
    scores[lobby.winnerIndex] >= 5
      ? lobby.winnerIndex
      : scores.findIndex((score) => score >= 5);
  const winner = winnerIndex >= 0 ? lobby?.players[winnerIndex]?.name : "";
  const canCallNumber =
    setupComplete && !winner && lobby?.turn === playerIndex && lobbyReady;

  useEffect(() => {
    if (!session || !playerName) {
      return;
    }

    savePlayerSession(playerName, session);
  }, [playerName, session]);

  useEffect(() => {
    if (!activeSession?.code) {
      return undefined;
    }

    async function refreshLobby() {
      if (optimisticPendingRef.current) {
        return;
      }

      try {
        const latestLobby = await fetchLobby(activeSession.code);

        if (!isValidLobby(latestLobby)) {
          throw new Error("Saved lobby data is invalid. Please create a new lobby.");
        }

        setLobby(latestLobby);
      } catch (error) {
        removeSavedPlayerSession();
        setPlayerName(activePlayerName);
        setMessage(error.message);
        setSession(null);
        setLobby(null);
      }
    }

    refreshLobby();
    const interval = window.setInterval(refreshLobby, 800);

    return () => window.clearInterval(interval);
  }, [activePlayerName, activeSession]);

  async function commitLobby(updatedLobby, { optimistic = false } = {}) {
    if (optimistic) {
      optimisticPendingRef.current = true;
      setLobby(updatedLobby);
    }

    const data = await apiRequest({
      action: "update",
      code: updatedLobby.code,
      lobby: updatedLobby,
    });
    optimisticPendingRef.current = false;
    if (isValidLobby(data.lobby)) {
      setLobby(data.lobby);
    }
  }

  function confirmName() {
    if (!playerName.trim()) {
      setMessage("Enter your player name first.");
      return;
    }

    const confirmedName = playerName.trim();
    setPlayerName(confirmedName);
    setNameConfirmed(true);
    savePlayerSession(confirmedName, null);
    setMessage("");
  }

  async function createLobby() {
    try {
      const data = await apiRequest({
        action: "create",
        playerName: activePlayerName,
      });
      if (!isValidLobby(data.lobby)) {
        throw new Error("Created lobby data is invalid.");
      }

      setLobby(data.lobby);
      setSession({ code: data.lobby.code, playerIndex: data.playerIndex });
      setJoinCode(data.lobby.code);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function joinLobby() {
    try {
      const data = await apiRequest({
        action: "join",
        code: joinCode,
        playerName: activePlayerName,
      });
      if (!isValidLobby(data.lobby)) {
        throw new Error("Joined lobby data is invalid.");
      }

      setLobby(data.lobby);
      setSession({ code: data.lobby.code, playerIndex: data.playerIndex });
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  function leaveLobby() {
    removeSavedPlayerSession();
    setSession(null);
    setLobby(null);
    setJoinCode("");
    setMessage("");
  }

  async function resetLobby() {
    if (!lobby) {
      return;
    }

    try {
      await apiRequest({ action: "close", code: lobby.code });
      leaveLobby();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function fillCell(index) {
    if (!lobby || playerIndex < 0 || !lobbyReady || setupComplete) {
      return;
    }

    try {
      const board = lobby.boards[playerIndex];

      if (board[index]) {
        return;
      }

      const numberToPlace = lobby.nextNumbers[playerIndex];
      const updatedBoards = lobby.boards.map((playerBoard, boardIndex) =>
        boardIndex === playerIndex
          ? playerBoard.map((value, cellIndex) =>
              cellIndex === index ? numberToPlace : value,
            )
          : playerBoard,
      );

      const updatedNextNumbers = lobby.nextNumbers.map((number, indexToUpdate) =>
        indexToUpdate === playerIndex && number < 25 ? number + 1 : number,
      );

      await commitLobby({
        ...lobby,
        boards: updatedBoards,
        nextNumbers: updatedNextNumbers,
      }, { optimistic: true });
    } catch (error) {
      optimisticPendingRef.current = false;
      setMessage(error.message);
    }
  }

  async function callNumber(number) {
    if (!lobby || !canCallNumber || lobby.calledNumbers.includes(number)) {
      return;
    }

    try {
      if (lobby.calledNumbers.includes(number) || lobby.turn !== playerIndex) {
        return;
      }

      const nextCalledNumbers = [...lobby.calledNumbers, number];
      const nextScores = lobby.boards.map((board) =>
        Math.min(getCompletedLines(board, nextCalledNumbers), 5),
      );
      const nextWinnerIndex =
        nextScores[playerIndex] >= 5
          ? playerIndex
          : nextScores[opponentIndex] >= 5
            ? opponentIndex
            : null;

      await commitLobby({
        ...lobby,
        calledNumbers: nextCalledNumbers,
        turn: opponentIndex,
        winnerIndex: nextWinnerIndex,
      }, { optimistic: true });
    } catch (error) {
      optimisticPendingRef.current = false;
      setMessage(error.message);
    }
  }

  async function startNewGame() {
    if (!lobby) {
      return;
    }

    try {
      const latestLobby = await fetchLobby(lobby.code);
      await commitLobby({
        ...latestLobby,
        boards: [
          Array.from({ length: 25 }, () => null),
          Array.from({ length: 25 }, () => null),
        ],
        nextNumbers: [1, 1],
        calledNumbers: [],
        turn: 0,
        winnerIndex: null,
      });
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (!hasConfirmedName) {
    return (
      <section className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Enter Your Name</CardTitle>
            <CardDescription>
              Your name is shown in the lobby and on the scoreboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Player name
              <Input
                autoFocus
                onChange={(event) => setPlayerName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    confirmName();
                  }
                }}
                placeholder="Enter your name"
                value={playerName}
              />
            </label>
            <Button onClick={confirmName} type="button">
              Continue
            </Button>
          </CardContent>
        </Card>
        {message ? (
          <p className="mt-4 rounded-lg bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900">
            {message}
          </p>
        ) : null}
      </section>
    );
  }

  if (activeSession && playerIndex >= 0 && !lobby) {
    return (
      <section className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Restoring Game</CardTitle>
            <CardDescription>
              Loading your current lobby and private board.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold text-slate-700">
              Playing as <span className="text-slate-950">{activePlayerName}</span>
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (!activeSession || playerIndex < 0 || !lobby) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700">
            Playing as <span className="text-slate-950">{activePlayerName}</span>
          </p>
          <Button
            onClick={() => {
              removeSavedPlayerSession();
              setNameConfirmed(false);
              setSession(null);
              setLobby(null);
              setMessage("");
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Change Name
          </Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Create Lobby</CardTitle>
              <CardDescription>
                Start a new lobby and share the code with Player 2.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={createLobby} type="button">
                Make Lobby
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Join Lobby</CardTitle>
              <CardDescription>
                Enter the code from Player 1 to join their lobby.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Lobby code
                <Input
                  className="uppercase"
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  placeholder="ABC123"
                  value={joinCode}
                />
              </label>
              <Button onClick={joinLobby} type="button" variant="secondary">
                Join Lobby
              </Button>
            </CardContent>
          </Card>
        </div>
        {message ? (
          <p className="mt-4 rounded-lg bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900">
            {message}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100vh-74px)] bg-slate-50">
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <h1 className="text-xl font-black tracking-normal text-slate-950">
            Bingo
          </h1>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Lobby:</span>
            <span className="text-xl font-black tracking-normal text-emerald-700">
              {lobby.code}
            </span>
            <CopyButton content={lobby.code} title="Copy lobby code" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {[playerIndex, opponentIndex].map((index) => (
              <div className="flex items-center gap-2" key={index}>
                <span className="text-sm font-black text-slate-950">
                  {lobby.players[index].name || `Player ${index + 1}`}
                </span>
                <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black capitalize text-slate-950 ring-1 ring-slate-200">
                  {index === playerIndex ? "You" : opponent?.joined ? "Opponent" : "Waiting"}
                </span>
              </div>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button onClick={leaveLobby} type="button" variant="outline">
              Leave
            </Button>
            {playerIndex === 0 ? (
              <Button onClick={resetLobby} type="button" variant="outline">
                Close Lobby
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1500px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <Card className="min-h-[500px]">
          <CardContent className="flex h-full flex-col gap-5 p-5 sm:p-6">
            <div>
              <h2 className="text-2xl font-black tracking-normal text-slate-950">
                {setupComplete ? "Call a Number" : "Your Board Setup"}
              </h2>
              <p className="mt-1 text-base text-slate-500">
                {setupComplete
                  ? "Choose a number on your turn"
                  : "Place numbers 1 to 25 on your private board"}
              </p>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-slate-800">
              <p className="text-base font-black">Game Status</p>
              <p className="mt-1 text-sm leading-6">
                One completed row, column, or diagonal earns the next letter.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {[playerIndex, opponentIndex].map((index) => (
                  <div className="space-y-2" key={index}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-slate-950">
                        {index === playerIndex
                          ? `${lobby.players[index].name} (You)`
                          : lobby.players[index].name || "Opponent"}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        {scores[index]} / 5
                      </p>
                    </div>
                    <BingoLetters count={scores[index]} />
                  </div>
                ))}
              </div>
            </div>

            {winner ? (
              <div className="rounded-lg bg-emerald-100 p-4 text-emerald-900">
                <p className="text-lg font-black">{winner} wins BINGO!</p>
                <Button className="mt-3" onClick={startNewGame} type="button" variant="success">
                  Start New Game
                </Button>
              </div>
            ) : setupComplete ? (
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                {NUMBERS.map((number) => (
                  <Button
                    className="font-black"
                    disabled={lobby.calledNumbers.includes(number) || !canCallNumber}
                    key={number}
                    onClick={() => callNumber(number)}
                    size="icon"
                    type="button"
                    variant={lobby.calledNumbers.includes(number) ? "success" : "secondary"}
                  >
                    {number}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
                {!lobbyReady
                  ? "Share the lobby code with Player 2."
                  : ownSetupComplete
                    ? "Your board is complete."
                    : `Place ${lobby.nextNumbers[playerIndex]} anywhere on your board.`}
              </div>
            )}

            {!winner ? (
              <p className="mt-auto rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                {!lobbyReady
                  ? "Waiting for Player 2 to join with the lobby code."
                  : !ownSetupComplete
                    ? `Place number ${lobby.nextNumbers[playerIndex]} on your board.`
                    : !setupComplete
                      ? "Your board is ready. Waiting for your opponent."
                      : canCallNumber
                        ? "Your turn: choose a number."
                        : `${lobby.players[lobby.turn].name}'s turn to choose a number.`}
              </p>
            ) : null}

            {message ? (
              <p className="rounded-lg bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900">
                {message}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="min-h-[500px]">
          <CardContent className="p-5 sm:p-6">
            <Board
              active={canCallNumber || (lobbyReady && !ownSetupComplete)}
              board={currentBoard}
              calledNumbers={lobby.calledNumbers}
              onCellClick={fillCell}
              setupMode={lobbyReady && !ownSetupComplete}
              title={`${currentPlayer?.name}'s private board`}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
