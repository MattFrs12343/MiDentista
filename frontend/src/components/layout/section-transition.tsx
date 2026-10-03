import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { SectionLoader } from "@/components/ui/section-loader";
import { ErrorBoundary, TarjetaError } from "@/components/ui/error-boundary";

/**
 * Los chunks de seccion pesan ~2 KB y Vite los precarga, asi que al navegar el
 * codigo ya esta en memoria y <Suspense> resuelve en un microtask: nunca alcanza
 * a pintarse el fallback y el usuario no ve ninguna confirmacion.
 *
 * Por eso la carga no se mide en red, sino en la transicion: el indicador
 * aparece en el mismo frame del toque y se sostiene el tiempo de un push de iOS.
 * Un spinner que parpadea 40ms es peor que ningun spinner, de ahi el minimo.
 */
const MINIMO_VISIBLE_MS = 420;

export function SectionTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    const t = window.setTimeout(() => setCargando(false), MINIMO_VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <div className="relative">
      {/* Si el chunk de la seccion tarda mas que la transicion o falla, el
          fallback del Suspense (spinner) y el ErrorBoundary se encargan. Antes
          el fallback era `null`: una seccion que tardaba mas de 420ms se quedaba
          en blanco, sin spinner y sin error, que es lo que se veia como
          "a veces no carga". */}
      <ErrorBoundary
        key={pathname}
        fallback={
          <TarjetaError
            mensaje="No se pudo cargar esta sección. Vuelve a intentarlo."
            onRetry={() => window.location.reload()}
          />
        }
      >
        {/* `invisible` y no `hidden`: el contenido conserva su altura mientras se
            carga, asi la pagina no salta al llegar el dato. Como el spinner va
            superpuesto (absolute), la altura no se duplica durante la espera. */}
        <div aria-busy={cargando} className={cargando ? "invisible" : undefined}>
          <Suspense fallback={<SectionLoader />}>{children}</Suspense>
        </div>
      </ErrorBoundary>

      {cargando ? (
        <div className="absolute inset-x-0 top-0 z-10">
          <SectionLoader />
        </div>
      ) : null}
    </div>
  );
}
