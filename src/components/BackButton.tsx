import { ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
}

// If `to` is provided, navigates to that route. Otherwise pops history (or
// falls back to `to` when history is empty, e.g. deep-linked entry).
export function BackButton({ to, label = "Back", className }: BackButtonProps) {
  const navigate = useNavigate();
  const cls =
    "flex h-9 items-center gap-2 rounded-xl border border-border/40 bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground " +
    (className ?? "");

  if (to && window.history.length <= 1) {
    return (
      <Link to={to} className={cls}>
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) navigate(-1);
        else if (to) navigate(to);
        else navigate("/dashboard");
      }}
      className={cls}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
