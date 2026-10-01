import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import type { IconProps } from "@phosphor-icons/react";

export type ModuleTone = "blue" | "violet" | "green" | "yellow";

interface HeaderData {
  title: string;
  subtitle?: string;
  icon?: ComponentType<IconProps>;
  tone?: ModuleTone;
}

interface HeaderState extends HeaderData {
  setHeader: (data: HeaderData) => void;
}

const PageHeaderContext = createContext<HeaderState | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<HeaderData>({ title: "Mi Dentista" });
  const value = useMemo(() => ({ ...header, setHeader }), [header]);

  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

export function usePageHeaderState() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) throw new Error("usePageHeaderState debe usarse dentro de PageHeaderProvider");
  return ctx;
}

export function usePageHeader(data: HeaderData) {
  const { setHeader } = usePageHeaderState();
  useEffect(() => {
    setHeader(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.title, data.subtitle, data.icon, data.tone]);
}
