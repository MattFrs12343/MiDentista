import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DataTableAlign = "left" | "center" | "right";

export type DataTableDensity = "compact" | "normal";

/** Punto en el que la columna vuelve a aparecer; antes queda oculta. */
export type DataTableBreakpoint = "sm" | "md" | "lg";

/**
 * Definición de una columna. Es una configuración, no un `accessorKey`: cada
 * módulo decide qué se ve en su celda (un monto formateado, un badge de estado,
 * una acción) sin que la tabla tenga que adivinarlo por el nombre del campo.
 */
export interface DataTableColumn<T> {
  /** Identificador estable de la columna; también se usa como clave de React. */
  key: string;
  /** Texto del encabezado. */
  header: ReactNode;
  /** Alineación del encabezado y de las celdas. */
  align?: DataTableAlign;
  /** Azúcar para `align: "right"` + cifras de ancho fijo (montos, horas, cantidades). */
  numeric?: boolean;
  /** Ancho de la columna, en cualquier valor válido de CSS (`"9rem"`, `"20%"`). */
  width?: string;
  /** Render por celda, con la fila y su índice. */
  cell?: (fila: T, indice: number) => ReactNode;
  /** Valor simple de la fila, cuando no hace falta un render propio. */
  accessor?: (fila: T) => ReactNode;
  /** Oculta la columna por debajo del breakpoint; en móvil la tabla scrollea. */
  hideBelow?: DataTableBreakpoint;
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTableProps<T> extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  columns: DataTableColumn<T>[];
  data: T[];
  /** Clave de React por fila. Si falta se usa el índice: preferí el id real. */
  rowKey?: (fila: T, indice: number) => string;
  /** Texto de la tabla, visible arriba y leído por lectores de pantalla. */
  caption?: ReactNode;
  /** Nombre accesible del área con scroll. */
  label?: string;
  /** Densidad de las filas: `compact` para listados largos (agenda, pagos). */
  density?: DataTableDensity;
  /** Encabezado fijo al hacer scroll vertical. */
  stickyHeader?: boolean;
  /**
   * Alto máximo del área con scroll. Con scroll vertical propio el
   * encabezado sticky se ancla; sin él el encabezado acompaña al scroll de la
   * página y no queda fijo.
   */
  maxHeight?: string;
  /** Contenido cuando no hay filas. Reemplaza el mensaje por defecto. */
  empty?: ReactNode;
  /** El área con scroll es un `region` enfocable, para teclado y lectores de pantalla. */
  scrollable?: boolean;
  tableClassName?: string;
}

const ALINEACION: Record<DataTableAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const OCULTAR_HASTA: Record<DataTableBreakpoint, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

/** Sin `cell` ni `accessor` la celda muestra un guion largo, como el resto de la app. */
function contenidoDe<T>(columna: DataTableColumn<T>, fila: T, indice: number): ReactNode {
  if (columna.cell) return columna.cell(fila, indice);
  if (columna.accessor) return columna.accessor(fila);
  return "‐";
}

/**
 * Shell de tabla para listados de la app. Sin dependencias extra: las columnas
 * se configuran a mano, así que el orden, el ancho y el contenido de cada celda
 * son explícitos y no hay motor de render oculto.
 *
 * Hereda del patrón de tabla de la plantilla de referencia (contenedor con
 * scroll, encabezado fijo, celda con render propio) pero con el lenguaje de
 * MiDentista: superficie cálida, radios de la app, `tabular-nums` en las cifras y
 * bordes `line` en vez de los grises fríos y los bordes rectos de la plantilla.
 *
 * Es una tabla pura: la fila no es clickeable. Para una fila que navega, poné el
 * enlace o el botón dentro de la celda, así el teclado y el lector de pantalla
 * lo recorren sin trucos.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  caption,
  label = "Tabla de datos",
  density = "normal",
  stickyHeader = true,
  maxHeight,
  empty,
  scrollable = true,
  className,
  tableClassName,
  ...props
}: DataTableProps<T>) {
  const compacto = density === "compact";
  const celda = compacto ? "px-3 py-2 text-[13px]" : "px-4 py-3 text-sm";
  const cabecera = compacto ? "px-3 py-2 text-[11px]" : "px-4 py-2.5 text-[12px]";
  const sinFilas = data.length === 0;

  return (
    <div className={cn("w-full", className)} {...props}>
      {/* El contenedor es el scrollport: en móvil la tabla se desliza en
          horizontal en lugar de romper el layout. */}
      <div
        role="region"
        aria-label={label}
        tabIndex={scrollable ? 0 : undefined}
        style={maxHeight ? { maxHeight } : undefined}
        className={cn(
          "w-full overflow-x-auto overscroll-x-contain rounded-panel border border-line bg-surface",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
          maxHeight && "overflow-y-auto",
        )}
      >
        <table
          className={cn(
            // `border-separate`: con `collapse` el borde pegado de un `sticky`
            // puede no pintarse en algunos navegadores, y el encabezado fijo
            // queda sin la línea de separación del cuerpo.
            "w-full border-separate border-spacing-0 text-left",
            tableClassName,
          )}
        >
          {caption ? (
            <caption className="px-4 py-3 text-left text-[13px] font-medium text-ink-soft">
              {caption}
            </caption>
          ) : null}

          <thead
            className={cn(stickyHeader && "sticky top-0 z-10", !stickyHeader && "static")}
          >
            <tr>
              {columns.map((columna) => {
                const alineacion = columna.numeric ? "right" : (columna.align ?? "left");
                return (
                  <th
                    key={columna.key}
                    scope="col"
                    style={columna.width ? { width: columna.width } : undefined}
                    className={cn(
                      "border-b border-line-strong bg-surface-sunken font-semibold tracking-[0.04em] whitespace-nowrap text-ink-muted uppercase",
                      cabecera,
                      ALINEACION[alineacion],
                      columna.hideBelow && OCULTAR_HASTA[columna.hideBelow],
                      columna.headerClassName,
                    )}
                  >
                    {columna.header}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {sinFilas ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-2">
                  {empty ?? (
                    <p className="py-6 text-center text-[13px] text-ink-muted">
                      Sin registros para mostrar.
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              data.map((fila, indice) => (
                <tr
                  key={rowKey ? rowKey(fila, indice) : String(indice)}
                  className="bg-surface transition-colors duration-100 ease-out hover:bg-surface-sunken"
                >
                  {columns.map((columna) => {
                    const alineacion = columna.numeric ? "right" : (columna.align ?? "left");
                    return (
                      <td
                        key={columna.key}
                        className={cn(
                          "border-b border-line text-ink-soft",
                          celda,
                          ALINEACION[alineacion],
                          columna.numeric && "tabular-nums",
                          columna.hideBelow && OCULTAR_HASTA[columna.hideBelow],
                          columna.cellClassName,
                        )}
                      >
                        {contenidoDe(columna, fila, indice)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
