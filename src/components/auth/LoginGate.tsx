import { useState, type FormEvent } from "react";
import { TulipLogo } from "@/components/drinks/DrinkIcon";
import { signIn } from "@/hooks/useAuth";
import { enterDemo } from "@/demo/demoMode";

export default function LoginGate() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    const err = await signIn(pin.trim());
    setSubmitting(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <TulipLogo size={56} />
          <div>
            <h1 className="font-display text-2xl text-foreground">Tiny Tulip Coffee Console</h1>
            <p className="text-sm text-muted-foreground font-body mt-1">Enter the team passcode to continue</p>
          </div>
        </div>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={e => {
            setPin(e.target.value);
            setError(null);
          }}
          placeholder="Passcode"
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-center text-lg tracking-widest font-body focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        {error && <p className="text-sm text-destructive font-body">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !pin.trim()}
          className="w-full rounded-lg bg-accent text-accent-foreground px-4 py-3 font-body font-semibold hover-scale active:scale-95 transition-all disabled:opacity-50"
        >
          {submitting ? "Checking…" : "Unlock"}
        </button>

        <div className="pt-4 border-t border-border space-y-2">
          <p className="text-sm text-muted-foreground font-body">Just looking around?</p>
          <button
            type="button"
            onClick={enterDemo}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 font-body font-semibold text-foreground hover:bg-muted/30 active:scale-95 transition-all"
          >
            Explore the demo
          </button>
          <p className="text-xs text-muted-foreground font-body">
            Sample data only. Nothing you do affects the real app.
          </p>
        </div>
      </form>
    </div>
  );
}
