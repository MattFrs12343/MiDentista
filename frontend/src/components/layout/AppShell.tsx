import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { PageHeaderProvider } from "@/components/layout/PageHeaderContext";
import { AppBackground } from "@/components/ui/app-background";
import { SectionTransition } from "@/components/layout/section-transition";

export function AppShell() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    if (!menuAbierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAbierto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuAbierto]);

  return (
    <PageHeaderProvider>
      <AppBackground />
      {/* `h-dvh` y no `h-screen`: 100vh en iOS Safari mide mas que el viewport
          visible cuando la barra del navegador esta colapsada, y el pie de la
          app quedaria debajo de ella, inalcanzable al hacer scroll del body. */}
      <div className="flex h-dvh overflow-hidden">
        <Sidebar menuAbierto={menuAbierto} onClose={() => setMenuAbierto(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            menuAbierto={menuAbierto}
            onMenuClick={() => setMenuAbierto(true)}
          />
          {/* el padding superior se cancela con -mt del HangingBanner para que
              las sogas nazcan pegadas al header; ambos deben coincidir.
              `overscroll-contain` evita que el scroll del contenido arrastre el
              gesto de pull-to-refresh del documento entero. */}
          <main className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
            <div className="mx-auto max-w-6xl">
              {/* el shell (sidebar + header) se mantiene visible: solo el area de
                  contenido entra en modo carga al cambiar de seccion. Ver
                  SectionTransition para por que la carga no se mide en red. */}
              <SectionTransition>
                <Outlet />
              </SectionTransition>
            </div>
          </main>
        </div>
      </div>
    </PageHeaderProvider>
  );
}
