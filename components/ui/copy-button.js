"use client";

import { useEffect, useState } from "react";

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect height="14" rx="2" ry="2" width="14" x="8" y="8" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function CopyButton({
  content = "",
  className = "",
  delay = 1800,
  onCopyChange,
  title = "Copy",
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setCopied(false);
      onCopyChange?.(false);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [copied, delay, onCopyChange]);

  async function handleCopy() {
    if (!content || copied) {
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onCopyChange?.(true);
    } catch {
      onCopyChange?.(false);
    }
  }

  return (
    <button
      aria-label={copied ? "Copied" : title}
      className={[
        "inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-950 text-white shadow-sm transition",
        "hover:scale-105 hover:bg-slate-800 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
        copied ? "bg-emerald-600 hover:bg-emerald-600" : "",
        className,
      ].join(" ")}
      onClick={handleCopy}
      title={copied ? "Copied" : title}
      type="button"
    >
      <span className="transition-transform duration-150">
        {copied ? <CheckIcon /> : <CopyIcon />}
      </span>
    </button>
  );
}
