"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
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

function AnswerBadge({ answer }) {
  const styles = {
    yes: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    no: "bg-red-100 text-red-800 ring-red-200",
    maybe: "bg-amber-100 text-amber-800 ring-amber-200",
    waiting: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  const value = answer || "waiting";

  return (
    <span
      className={[
        "inline-flex h-8 items-center rounded-full px-3 text-xs font-black uppercase ring-1",
        styles[value],
      ].join(" ")}
    >
      {value}
    </span>
  );
}

function ConversationRow({ item, number, player }) {
  const answer = item.answer || "waiting";
  const rowStyles = {
    yes: "border-emerald-200 bg-emerald-50",
    no: "border-red-200 bg-red-50",
    maybe: "border-amber-200 bg-amber-50",
    waiting: "border-slate-200 bg-slate-50",
  };
  const pillStyles = {
    yes: "bg-emerald-100 text-emerald-800",
    no: "bg-red-100 text-red-800",
    maybe: "bg-amber-100 text-amber-800",
    waiting: "bg-slate-100 text-slate-700",
  };
  const initials = player
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={[
        "grid items-center gap-4 rounded-lg border p-4 shadow-sm sm:grid-cols-[52px_52px_1fr_auto]",
        rowStyles[answer],
      ].join(" ")}
    >
      <span
        className={[
          "flex h-11 w-11 items-center justify-center rounded-full text-sm font-black",
          pillStyles[answer],
        ].join(" ")}
      >
        #{number}
      </span>
      <span
        className={[
          "flex h-11 w-11 items-center justify-center rounded-full text-sm font-black",
          pillStyles[answer],
        ].join(" ")}
      >
        {initials}
      </span>
      <p className="text-base font-semibold leading-7 text-slate-950">{item.text}</p>
      <AnswerBadge answer={item.answer} />
    </div>
  );
}

function ActionIcon({ type }) {
  const answerIcon = (
    <svg
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 1 1 5.8 1c-.5 1-1.5 1.4-2.3 2-.6.4-.6.8-.6 1.5" />
      <path d="M12 17h.01" />
    </svg>
  );
  const guessIcon = (
    <svg
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
  const conversationIcon = (
    <svg
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    </svg>
  );
  const styles = {
    answer: "bg-violet-100 text-violet-600",
    guess: "bg-violet-600 text-white",
    conversation: "bg-blue-600 text-white",
  };
  const icons = {
    answer: answerIcon,
    guess: guessIcon,
    conversation: conversationIcon,
  };

  return (
    <span
      className={[
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
        styles[type],
      ].join(" ")}
    >
      {icons[type]}
    </span>
  );
}

function AnswerOptionButton({ answer, onClick }) {
  const styles = {
    yes: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    no: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    maybe: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  };
  const icons = {
    yes: "Y",
    no: "N",
    maybe: "?",
  };

  return (
    <button
      className={[
        "flex min-h-14 items-center gap-3 rounded-lg border p-3 text-left text-sm font-black uppercase transition",
        styles[answer],
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/65 text-2xl">
        {icons[answer]}
      </span>
      {answer}
    </button>
  );
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
    <section className="min-h-[calc(100vh-74px)] bg-slate-50">
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <h1 className="text-xl font-black tracking-normal text-slate-950">
            Guess Word
          </h1>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Lobby:</span>
            <span className="text-xl font-black tracking-normal text-violet-600">
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
                  {index === playerIndex ? "You - " : ""}
                  {lobby.players[index].joined ? lobby.players[index].role : "Waiting"}
                </span>
              </div>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button onClick={leaveLobby} type="button" variant="outline">
              Leave
            </Button>
            {playerIndex === 0 ? (
              <Button onClick={closeLobby} type="button" variant="outline">
                Close Lobby
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1500px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Card className="min-h-[500px]">
          <CardContent className="flex h-full flex-col p-5 sm:p-6">
            <div className="mb-6 flex items-start gap-4">
              <ActionIcon type={isAnswerer ? "answer" : "guess"} />
              <div>
                <h2 className="text-2xl font-black tracking-normal text-slate-950">
                  {lobby.status === "won"
                    ? `${lobby.players[lobby.winnerIndex]?.name} guessed it`
                    : isGuesser
                      ? "Write a Guess"
                      : "Answer the Guesser"}
                </h2>
                <p className="mt-1 text-base text-slate-500">
                  {isGuesser
                    ? "Ask a question or guess the word"
                    : "Reply yes, no, or maybe"}
                </p>
              </div>
            </div>
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
              <div className="flex flex-1 flex-col gap-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-slate-800">
                  <p className="text-base font-black">Your Role: Guesser</p>
                  <p className="mt-1 text-sm leading-6">
                    The word is 3 or 4 characters long. It may be food, an insect,
                    a bird, or a daily used item.
                  </p>
                </div>
                <Textarea
                  className="min-h-40 flex-1 resize-none border-slate-300 bg-slate-50 p-4 text-sm"
                  disabled={!lobbyReady}
                  onChange={(event) => setGuessText(event.target.value)}
                  placeholder="Example: Is it something we eat? Or type the actual word"
                  value={guessText}
                />
                <p className="text-sm text-slate-500">
                  The answerer may only respond: yes, no, or maybe
                </p>
                <Button
                  className="h-12 w-full bg-violet-600 text-base font-black hover:bg-violet-700"
                  disabled={!lobbyReady || !guessText.trim()}
                  onClick={sendGuess}
                  type="button"
                >
                  Send Guess
                </Button>
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-slate-800">
                  <p className="text-base font-black">Your Role: Answerer</p>
                  <p className="mt-1 text-sm leading-6">
                    The secret word is shown only to you. Answer the guesser with
                    yes, no, or maybe.
                  </p>
                  <p className="mt-3 rounded-lg bg-amber-100 p-4 text-3xl font-black uppercase tracking-normal text-amber-900">
                    {lobby.word}
                  </p>
                </div>
                {unansweredGuess ? (
                  <>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-black uppercase text-slate-500">
                        Latest question
                      </p>
                      <p className="mt-2 text-xl font-black leading-7 text-slate-950">
                        {unansweredGuess.text}
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      {["yes", "no", "maybe"].map((answer) => (
                        <AnswerOptionButton
                          answer={answer}
                          key={answer}
                          onClick={() => answerGuess(answer)}
                        />
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

        <Card className="min-h-[500px]">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-8 flex items-start gap-4">
              <ActionIcon type="conversation" />
              <div>
                <h2 className="text-2xl font-black tracking-normal text-slate-950">
                  Conversation
                </h2>
                <p className="mt-1 text-base text-slate-500">
                  Newest guesses appear at the top
                </p>
              </div>
            </div>
            {lobby.messages.length ? (
              <div className="max-h-[360px] space-y-4 overflow-y-auto pr-1">
                {lobby.messages.slice().reverse().map((item, index) => {
                  const player = lobby.players[item.from]?.name || "Player";
                  const number = lobby.messages.length - index;

                  return (
                    <ConversationRow
                      item={item}
                      key={item.id}
                      number={number}
                      player={player}
                    />
                  );
                })}
              </div>
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
