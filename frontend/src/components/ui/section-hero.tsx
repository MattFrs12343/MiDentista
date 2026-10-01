import type { ComponentType, ReactNode } from "react";
import type { IconProps } from "@phosphor-icons/react";
import type { ModuleTone } from "@/components/layout/PageHeaderContext";
import { cn } from "@/lib/cn";

const TONE_GRADIENT: Record<ModuleTone, string> = {
  blue: "from-brand-900 via-brand-700 to-brand-400",
  violet: "from-[#2f2159] via-[#5b3f9f] to-[#9b81d6]",
  green: "from-[#123a26] via-[#2f6b48] to-[#6fb890]",
  yellow: "from-[#4a3208] via-[#93641c] to-[#d9a54a]",
};

export function SectionHero({
  icon: Icon,
  tone,
  kicker,
  heading,
  description,
  photo,
  photoPosition = "center",
  children,
  className,
}: {
  icon: ComponentType<IconProps>;
  tone: ModuleTone;
  kicker: string;
  heading: string;
  description?: string;
  photo?: string;
  photoPosition?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-56 items-center overflow-hidden rounded-2xl bg-gradient-to-r",
        TONE_GRADIENT[tone],
        className,
      )}
    >
      {photo ? (
        <>
          <img
            src={photo}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: photoPosition }}
          />
          <div className="absolute inset-0 bg-ink/10" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(22,35,58,0.93)_0%,rgba(22,35,58,0.78)_38%,rgba(22,35,58,0.28)_64%,rgba(22,35,58,0.06)_100%)]" />
        </>
      ) : null}

      <Icon
        weight="duotone"
        className="pointer-events-none absolute -bottom-10 -right-8 text-white/10"
        style={{ width: 220, height: 220, transform: "rotate(-12deg)" }}
      />

      <div className="relative z-10 flex max-w-md flex-col px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{kicker}</p>
        <h2 className="mt-2 text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-white">
          {heading}
        </h2>
        {description ? <p className="mt-2 text-sm text-white/80">{description}</p> : null}
        {children}
      </div>
    </div>
  );
}
