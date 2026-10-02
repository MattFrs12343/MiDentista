import { Component, type ReactNode } from "react";
import { WarningCircle, ArrowClockwise } from "@phosphor-icons/react";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  huboError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { huboError: false };

  static getDerivedStateFromError() {
    return { huboError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Error capturado por ErrorBoundary:", error);
  }

  render() {
    if (this.state.huboError) return this.props.fallback;
    return this.props.children;
  }
}

export function TarjetaError({ mensaje, onRetry }: { mensaje: string; onRetry?: () => void }) {
  return (
    <div className="flex h-80 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface-sunken text-center">
      <WarningCircle size={22} className="text-ink-muted" />
      <p className="max-w-xs text-sm text-ink-muted">{mensaje}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-line"
        >
          <ArrowClockwise size={14} weight="bold" /> Reintentar
        </button>
      ) : null}
    </div>
  );
}
