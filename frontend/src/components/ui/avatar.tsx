import { cn } from "@/lib/cn";
import { iniciales } from "@/lib/nombre";

export function Avatar({ nombre, className }: { nombre: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700",
        className,
      )}
    >
      {iniciales(nombre)}
    </div>
  );
}
