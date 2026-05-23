"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SESSION_KEY = "guess-word-player-session";

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

async function apiRequest(body) {
  const response = await fetch("/api/word-lobbies", {
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
  const response = await fetch(`/api/word-lobbies?code=${encodeURIComponent(code)}`, {
    cache: "no-store",
  });
  const text = await response.text();
  const data = parseApiResponse(text);

  if (!response.ok) {
    throw new Error(data.error ?? "No lobby found with that code.");
  }

  return data.lobby;
}

function saveSession(playerName, session) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ playerName, session }));
  } catch {
    // Some browsers block storage.
  }
}

function loadSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? "null");
    const playerIndex = parsed?.session?.playerIndex;

    if (
      parsed?.playerName &&
      parsed?.session?.code &&
      (playerIndex === 0 || playerIndex === 1)
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Some browsers block storage.
  }
}

function Input({ className = "", ...props }) {
  return (
    <input
      className={[
        "h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none",
        "focus:border-amber-500 focus:ring-2 focus:ring-amber-100",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={[
        "min-h-28 rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-950 outline-none",
        "focus:border-amber-500 focus:ring-2 focus:ring-amber-100",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

function isExactWordGuess(text, word) {
  const words = String(text).toLowerCase().match(/[a-z]+/g) ?? [];
  return words.includes(String(word).toLowerCase());
}

export default function GuessWordGame() {
  const [savedSession] = useState(loadSession);
  const [playerName, setPlayerName] = useState(savedSession?.playerName ?? "");
  const [nameConfirmed, setNameConfirmed] = useState(Boolean(savedSession?.playerName));
  const [session, setSession] = useState(savedSession?.session ?? null);
  const [joinCode, setJoinCode] = useState(savedSession?.session?.code ?? "");
  const [creatorRole, setCreatorRole] = useState("guesser");
  const [lobby, setLobby] = useState(null);
  const [guessText, setGuessText] = useState("");
  const [message, setMessage] = useState("");
  const optimisticPendingRef = useRef(false);
  const messageIdRef = useRef(0);

  const playerIndex = session?.playerIndex === 0 || session?.playerIndex === 1
    ? session.playerIndex
    : -1;
  const opponentIndex = playerIndex === 0 ? 1 : 0;
  const currentPlayer = playerIndex >= 0 ? lobby?.players[playerIndex] : null;
  const opponent = playerIndex >= 0 ? lobby?.players[opponentIndex] : null;
  const role = currentPlayer?.role ?? "";
  const isGuesser = role === "guesser";
  const isAnswerer = role === "answerer";
  const lobbyReady = Boolean(lobby?.players.every((player) => player.joined));
  const unansweredGuess = useMemo(
    () =>
      lobby?.messages
        .slice()
        .reverse()
        .find((item) => item.from !== playerIndex && !item.answer),
    [lobby, playerIndex],
  );

  useEffect(() => {
    if (!session || !playerName) {
      return;
    }

    saveSession(playerName, session);
  }, [playerName, session]);

  useEffect(() => {
    if (!session?.code) {
      return undefined;
    }

    async function refreshLobby() {
      if (optimisticPendingRef.current) {
        return;
      }

      try {
        setLobby(await fetchLobby(session.code));
      } catch (error) {
        setMessage(error.message);
        setSession(null);
        setLobby(null);
        clearSession();
      }
    }

    refreshLobby();
    const interval = window.setInterval(refreshLobby, 800);

    return () => window.clearInterval(interval);
  }, [session]);

  async function commitLobby(updatedLobby, optimistic = false) {
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
    setLobby(data.lobby);
  }

  function confirmName() {
    if (!playerName.trim()) {
      setMessage("Enter your player name first.");
      return;
    }

    setPlayerName(playerName.trim());
    setNameConfirmed(true);
    setMessage("");
  }

  async function createLobby() {
    try {
      const data = await apiRequest({
        action: "create",
        playerName,
        creatorRole,
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
        playerName,
      });
      setLobby(data.lobby);
      setSession({ code: data.lobby.code, playerIndex: data.playerIndex });
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  function leaveLobby() {
    clearSession();
    setSession(null);
    setLobby(null);
    setJoinCode("");
    setMessage("");
  }

  async function closeLobby() {
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

  async function sendGuess() {
    if (!lobby || !isGuesser || !guessText.trim() || lobby.status === "won") {
      return;
    }

    const guessedCorrectly = isExactWordGuess(guessText, lobby.word);
    const updatedLobby = {
      ...lobby,
      messages: [
        ...lobby.messages,
        {
          id: `${playerIndex}-${lobby.round}-${messageIdRef.current += 1}`,
          from: playerIndex,
          text: guessText.trim(),
          answer: guessedCorrectly ? "yes" : "",
        },
      ],
      status: guessedCorrectly ? "won" : lobby.status,
      winnerIndex: guessedCorrectly ? playerIndex : lobby.winnerIndex,
    };

    setGuessText("");

    try {
      await commitLobby(updatedLobby, true);
    } catch (error) {
      optimisticPendingRef.current = false;
      setMessage(error.message);
    }
  }

  async function answerGuess(answer) {
    if (!lobby || !isAnswerer || !unansweredGuess || lobby.status === "won") {
      return;
    }

    const updatedLobby = {
      ...lobby,
      messages: lobby.messages.map((item) =>
        item.id === unansweredGuess.id ? { ...item, answer } : item,
      ),
    };

    try {
      await commitLobby(updatedLobby, true);
    } catch (error) {
      optimisticPendingRef.current = false;
      setMessage(error.message);
    }
  }

  async function newRound() {
    if (!lobby) {
      return;
    }

    try {
      const data = await apiRequest({ action: "new-round", code: lobby.code });
      setLobby(data.lobby);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (!nameConfirmed) {
    return (
      <section className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Enter Your Name</CardTitle>
            <CardDescription>Your name is shown in the word lobby.</CardDescription>
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

  if (!session || !lobby) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700">
            Playing as <span className="text-slate-950">{playerName}</span>
          </p>
          <Button
            onClick={() => {
              clearSession();
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
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Create Lobby</CardTitle>
              <CardDescription>
                Choose your role and share the code with Player 2.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {["guesser", "answerer"].map((item) => (
                  <Button
                    key={item}
                    onClick={() => setCreatorRole(item)}
                    type="button"
                    variant={creatorRole === item ? "default" : "secondary"}
                  >
                    {item === "guesser" ? "I Guess" : "I Answer"}
                  </Button>
                ))}
              </div>
              <Button onClick={createLobby} type="button">
                Make Lobby
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Join Lobby</CardTitle>
              <CardDescription>Enter the code from Player 1.</CardDescription>
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
    <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[340px_1fr] lg:px-8">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Word Lobby</CardTitle>
            <CardDescription>Round {lobby.round}</CardDescription>
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
            {[playerIndex, opponentIndex].map((index) => (
              <div
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
                key={index}
              >
                <span className="font-semibold">
                  {lobby.players[index].name || `Player ${index + 1}`}
                  {index === playerIndex ? " (You)" : ""}
                </span>
                <span className="capitalize text-slate-600">
                  {lobby.players[index].joined ? lobby.players[index].role : "Waiting"}
                </span>
              </div>
            ))}
            <div className="flex gap-2">
              <Button onClick={leaveLobby} type="button" variant="outline">
                Leave
              </Button>
              {playerIndex === 0 ? (
                <Button onClick={closeLobby} type="button" variant="ghost">
                  Close Lobby
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isAnswerer ? "Secret Word" : "Your Role"}</CardTitle>
            <CardDescription>
              {isAnswerer
                ? "Only you can see the word."
                : "Ask sentences and try to name the word."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAnswerer ? (
              <p className="rounded-lg bg-amber-100 p-5 text-4xl font-black uppercase tracking-normal text-amber-900">
                {lobby.word}
              </p>
            ) : (
              <p className="text-sm leading-6 text-slate-600">
                The word is 3 or 4 letters long. It may be food, an animal, a bird,
                an insect, or a daily used item.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>
              {lobby.status === "won"
                ? `${lobby.players[lobby.winnerIndex]?.name} guessed it`
                : isGuesser
                  ? "Write a Guess"
                  : "Answer the Guesser"}
            </CardTitle>
            <CardDescription>
              {lobbyReady
                ? "The answerer may only respond yes, no, or maybe."
                : "Waiting for Player 2 to join."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lobby.status === "won" ? (
              <div className="rounded-lg bg-emerald-100 p-4 text-emerald-900">
                <p className="text-lg font-black">
                  The word was {lobby.word.toUpperCase()}.
                </p>
                <Button className="mt-3" onClick={newRound} type="button" variant="success">
                  Start New Word
                </Button>
              </div>
            ) : isGuesser ? (
              <div className="space-y-3">
                <Textarea
                  disabled={!lobbyReady}
                  onChange={(event) => setGuessText(event.target.value)}
                  placeholder="Example: Is it something we eat? Or type the actual word."
                  value={guessText}
                />
                <Button
                  disabled={!lobbyReady || !guessText.trim()}
                  onClick={sendGuess}
                  type="button"
                >
                  Send Guess
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {unansweredGuess ? (
                  <>
                    <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-800">
                      {unansweredGuess.text}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {["yes", "no", "maybe"].map((answer) => (
                        <Button
                          key={answer}
                          onClick={() => answerGuess(answer)}
                          type="button"
                          variant={answer === "yes" ? "success" : "secondary"}
                        >
                          {answer.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    Waiting for the guesser to write a sentence.
                  </p>
                )}
              </div>
            )}
            {message ? (
              <p className="rounded-lg bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900">
                {message}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
            <CardDescription>Guesses and yes/no/maybe answers appear here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lobby.messages.length ? (
              lobby.messages.map((item) => (
                <div
                  className="rounded-lg border border-slate-200 bg-white p-4"
                  key={item.id}
                >
                  <p className="text-xs font-bold uppercase text-slate-500">
                    {lobby.players[item.from]?.name || "Player"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-800">{item.text}</p>
                  <p className="mt-2 inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-bold uppercase text-slate-700">
                    {item.answer || "Waiting"}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                No guesses yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
