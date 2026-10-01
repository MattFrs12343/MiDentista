import { AnimatedTeeth } from "@/components/ui/animated-teeth";

export function AppBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-canvas">
      <div className="mesh-blob-a absolute left-1/5 -top-1/4 h-[70%] w-[70%] rounded-full bg-brand-200/18 blur-3xl" />
      <div className="mesh-blob-b absolute -bottom-1/4 -right-1/5 h-[75%] w-[75%] rounded-full bg-brand-100/25 blur-3xl" />
      <AnimatedTeeth tone="subtle" />
    </div>
  );
}
