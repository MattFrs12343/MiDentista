import { Tooth } from "@phosphor-icons/react";

const teeth = [
  { top: "10%", left: "14%", size: 52, duration: 22, delay: "0s", opacity: 0.22 },
  { top: "18%", left: "82%", size: 70, duration: 28, delay: "-4s", opacity: 0.18 },
  { top: "68%", left: "10%", size: 46, duration: 26, delay: "-9s", opacity: 0.2 },
  { top: "76%", left: "72%", size: 62, duration: 24, delay: "-2s", opacity: 0.18 },
  { top: "38%", left: "38%", size: 40, duration: 30, delay: "-14s", opacity: 0.16 },
  { top: "8%", left: "48%", size: 44, duration: 20, delay: "-6s", opacity: 0.16 },
  { top: "52%", left: "92%", size: 40, duration: 27, delay: "-11s", opacity: 0.18 },
  { top: "58%", left: "58%", size: 34, duration: 25, delay: "-8s", opacity: 0.14 },
  { top: "30%", left: "62%", size: 30, duration: 23, delay: "-16s", opacity: 0.14 },
];

const toneClasses = {
  vivid: "text-brand-200",
  subtle: "text-brand-300",
};

const opacityScale = {
  vivid: 1,
  subtle: 0.9,
};

export function AnimatedTeeth({ tone = "vivid" }: { tone?: "vivid" | "subtle" }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {teeth.map((t, i) => (
        <Tooth
          key={i}
          weight="fill"
          className={`drift-tooth absolute ${toneClasses[tone]}`}
          style={{
            top: t.top,
            left: t.left,
            width: t.size,
            height: t.size,
            opacity: t.opacity * opacityScale[tone],
            animationDuration: `${t.duration}s`,
            animationDelay: t.delay,
          }}
        />
      ))}
    </div>
  );
}
