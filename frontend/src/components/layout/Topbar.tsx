import { usePageHeaderState, type ModuleTone } from "@/components/layout/PageHeaderContext";

const TONE_CLASSES: Record<ModuleTone, string> = {
  blue: "bg-pastel-blue-bg text-pastel-blue-fg",
  violet: "bg-pastel-violet-bg text-pastel-violet-fg",
  green: "bg-pastel-green-bg text-pastel-green-fg",
  yellow: "bg-pastel-yellow-bg text-pastel-yellow-fg",
};

export function Topbar() {
  const { title, subtitle, icon: Icon, tone } = usePageHeaderState();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-white/40 bg-white/50 px-8 backdrop-blur-xl">
      {Icon ? (
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE_CLASSES[tone ?? "blue"]}`}
        >
          <Icon size={18} weight="bold" />
        </div>
      ) : null}
      <div>
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        {subtitle ? <p className="text-sm text-ink-soft">{subtitle}</p> : null}
      </div>
    </header>
  );
}
