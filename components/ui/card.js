export function Card({ className = "", ...props }) {
  return (
    <section
      className={[
        "rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }) {
  return <div className={["p-5 pb-3", className].join(" ")} {...props} />;
}

export function CardTitle({ className = "", ...props }) {
  return (
    <h2
      className={["text-xl font-semibold tracking-normal", className].join(" ")}
      {...props}
    />
  );
}

export function CardDescription({ className = "", ...props }) {
  return (
    <p
      className={["mt-1 text-sm leading-6 text-slate-600", className].join(" ")}
      {...props}
    />
  );
}

export function CardContent({ className = "", ...props }) {
  return <div className={["p-5 pt-3", className].join(" ")} {...props} />;
}
