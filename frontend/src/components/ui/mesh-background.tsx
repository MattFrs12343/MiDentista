export function MeshBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-brand-900">
      <div className="mesh-blob-a absolute -left-1/4 -top-1/3 h-[70%] w-[70%] rounded-full bg-brand-400/50 blur-3xl" />
      <div className="mesh-blob-b absolute -bottom-1/3 -right-1/4 h-[75%] w-[75%] rounded-full bg-brand-200/35 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-900/20 to-brand-900/60" />
    </div>
  );
}
