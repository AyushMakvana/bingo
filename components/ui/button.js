export function Button({
  children,
  className = "",
  size = "default",
  variant = "default",
  ...props
}) {
  const variants = {
    default: "bg-slate-950 text-white hover:bg-slate-800",
    secondary: "bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-50",
    outline: "bg-transparent text-slate-950 ring-1 ring-slate-300 hover:bg-slate-100",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  };

  const sizes = {
    default: "h-11 px-5 text-sm",
    sm: "h-9 px-3 text-sm",
    icon: "h-10 w-10 p-0",
  };

  return (
    <button
      className={[
        "inline-flex items-center justify-center rounded-md font-medium transition disabled:pointer-events-none disabled:opacity-45",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
        variants[variant],
        sizes[size],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
