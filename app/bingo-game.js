"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
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
      <div className="mx-auto grid aspect-square w-full max-w-[520px] grid-cols-5 gap-1.5 sm:gap-2">
        {board.map((number, index) => {
          const marked = number && called.has(number);

          return (
            <button
              className={[
                "flex min-h-11 items-center justify-center rounded-md border text-base font-bold transition sm:text-lg",
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

  return window.localStorage.getItem(SESSION_KEY) ?? "";
}

function subscribeToSavedSession(callback) {
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
      return {
        playerName: parsedSession.playerName,
        session: parsedSession.session?.code ? parsedSession.session : null,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function savePlayerSession(playerName, session) {
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      playerName,
      session,
    }),
  );
  window.dispatchEvent(new Event("bingo-session-change"));
}

function removeSavedPlayerSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("bingo-session-change"));
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

  const activeSession = session ?? savedPlayerSession?.session ?? null;
  const activePlayerName = playerName || savedPlayerSession?.playerName || "";
  const hasConfirmedName = nameConfirmed || Boolean(savedPlayerSession?.playerName);
  const playerIndex = activeSession?.playerIndex ?? -1;
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
  const winnerIndex = scores.findIndex((score) => score >= 5);
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
      try {
        const latestLobby = await fetchLobby(activeSession.code);
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

  async function commitLobby(updatedLobby) {
    const data = await apiRequest({
      action: "update",
      code: updatedLobby.code,
      lobby: updatedLobby,
    });
    setLobby(data.lobby);
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
      const latestLobby = await fetchLobby(lobby.code);
      const board = latestLobby.boards[playerIndex];

      if (board[index]) {
        return;
      }

      const numberToPlace = latestLobby.nextNumbers[playerIndex];
      const updatedBoards = latestLobby.boards.map((playerBoard, boardIndex) =>
        boardIndex === playerIndex
          ? playerBoard.map((value, cellIndex) =>
              cellIndex === index ? numberToPlace : value,
            )
          : playerBoard,
      );

      const updatedNextNumbers = latestLobby.nextNumbers.map((number, indexToUpdate) =>
        indexToUpdate === playerIndex && number < 25 ? number + 1 : number,
      );

      await commitLobby({
        ...latestLobby,
        boards: updatedBoards,
        nextNumbers: updatedNextNumbers,
      });
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function callNumber(number) {
    if (!lobby || !canCallNumber || lobby.calledNumbers.includes(number)) {
      return;
    }

    try {
      const latestLobby = await fetchLobby(lobby.code);

      if (
        latestLobby.calledNumbers.includes(number) ||
        latestLobby.turn !== playerIndex
      ) {
        return;
      }

      await commitLobby({
        ...latestLobby,
        calledNumbers: [...latestLobby.calledNumbers, number],
        turn: opponentIndex,
      });
    } catch (error) {
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

  if (activeSession && !lobby) {
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

  if (!activeSession || !lobby) {
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
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Lobby</CardTitle>
              <CardDescription>
                Keep this screen private. Your opponent cannot see your board here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-slate-100 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Lobby code
                </p>
                <p className="mt-1 text-3xl font-black tracking-normal text-slate-950">
                  {lobby.code}
                </p>
              </div>
              <div className="grid gap-2 text-sm text-slate-700">
                <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <span>{currentPlayer?.name}</span>
                  <span className="font-semibold">You</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                  <span>{opponent?.name || "Player 2"}</span>
                  <span className="font-semibold">
                    {opponent?.joined ? "Joined" : "Waiting"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={leaveLobby} type="button" variant="outline">
                  Leave
                </Button>
                {playerIndex === 0 ? (
                  <Button onClick={resetLobby} type="button" variant="ghost">
                    Close Lobby
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Game Status</CardTitle>
              <CardDescription>
                One completed row, column, or diagonal earns the next letter.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {[playerIndex, opponentIndex].map((index) => (
                <div className="space-y-2" key={index}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">
                      {index === playerIndex
                        ? `${lobby.players[index].name} (You)`
                        : lobby.players[index].name || "Opponent"}
                    </p>
                    <p className="text-sm text-slate-500">{scores[index]} / 5</p>
                  </div>
                  <BingoLetters count={scores[index]} />
                </div>
              ))}
              {winner ? (
                <div className="space-y-3 rounded-lg bg-emerald-100 p-4 text-emerald-900">
                  <p className="text-lg font-black">{winner} wins BINGO!</p>
                  <Button onClick={startNewGame} type="button" variant="success">
                    Start New Game
                  </Button>
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-600">
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
              )}
              {message ? (
                <p className="rounded-lg bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900">
                  {message}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{setupComplete ? "Call a Number" : "Your Board Setup"}</CardTitle>
              <CardDescription>
                {setupComplete
                  ? "Called numbers are marked on both private boards."
                  : "Click your empty cells to place numbers from 1 to 25."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {setupComplete ? (
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                  {NUMBERS.map((number) => (
                    <Button
                      className="font-black"
                      disabled={lobby.calledNumbers.includes(number) || !canCallNumber}
                      key={number}
                      onClick={() => callNumber(number)}
                      size="icon"
                      type="button"
                      variant={
                        lobby.calledNumbers.includes(number) ? "success" : "secondary"
                      }
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
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
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
      </div>
    </section>
  );
}
