import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { CondicionDiente } from "@/types";

// Paleta categórica validada (orden fijo, contraste y separación CVD verificados
// con el validador del skill de dataviz). "Ausente" usa el gris de interfaz
// (no es un hallazgo clínico a tratar, es la ausencia de la pieza).
const HALLAZGOS: { condicion: CondicionDiente; etiqueta: string; color: string }[] = [
  { condicion: "caries", etiqueta: "Caries", color: "#e34948" },
  { condicion: "obturado", etiqueta: "Obturado", color: "#2a78d6" },
  { condicion: "corona", etiqueta: "Corona", color: "#eda100" },
  { condicion: "endodoncia", etiqueta: "Endodoncia", color: "#4a3aa7" },
  { condicion: "implante", etiqueta: "Implante", color: "#1baf7a" },
  { condicion: "extraccion_indicada", etiqueta: "Extracción indicada", color: "#eb6834" },
  { condicion: "ausente", etiqueta: "Ausente", color: "#898781" },
];

export function ClinicalFindingsChart({
  conteos,
}: {
  conteos: Partial<Record<CondicionDiente, number>>;
}) {
  const filas = HALLAZGOS.map((h) => ({ ...h, valor: conteos[h.condicion] ?? 0 })).sort(
    (a, b) => b.valor - a.valor,
  );
  const total = filas.reduce((acc, f) => acc + f.valor, 0);
  const maximo = Math.max(1, ...filas.map((f) => f.valor));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hallazgos clínicos</CardTitle>
        <CardDescription>
          {total === 0
            ? "Aún no hay condiciones registradas en los odontogramas."
            : `${total} ${total === 1 ? "pieza" : "piezas"} con condición registrada, por tipo`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        {filas.map((f) => {
          const porcentaje = f.valor === 0 ? 0 : Math.max(4, (f.valor / maximo) * 100);
          return (
            <div key={f.condicion} className="flex items-center gap-3">
              <span className="w-36 shrink-0 truncate text-sm text-ink-soft">{f.etiqueta}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-[3px] bg-surface-sunken">
                <div
                  className="h-full rounded-r-[4px] transition-[width] duration-500 ease-out"
                  style={{ width: `${porcentaje}%`, backgroundColor: f.color }}
                />
              </div>
              <span className="w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">
                {f.valor}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
