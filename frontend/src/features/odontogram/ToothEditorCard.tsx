import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { CONDICION_LABEL } from "@/features/odontogram/odontogramLayout";
import { nombrePieza } from "@/features/odontogram/toothNames";
import type { CondicionDiente, CondicionPieza } from "@/types";

const OPCIONES = Object.entries(CONDICION_LABEL) as [CondicionDiente, string][];

export function ToothEditorCard({
  pieza,
  condicion,
  onGuardar,
  onCerrar,
}: {
  pieza: number;
  condicion?: CondicionPieza;
  onGuardar: (pieza: number, condicion: CondicionDiente, nota: string) => void;
  onCerrar: () => void;
}) {
  const [seleccion, setSeleccion] = useState<CondicionDiente>(condicion?.condicion ?? "sano");
  const [nota, setNota] = useState(condicion?.nota ?? "");

  useEffect(() => {
    setSeleccion(condicion?.condicion ?? "sano");
    setNota(condicion?.nota ?? "");
  }, [pieza, condicion]);

  return (
    <Card className="fade-in-up">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Pieza {pieza}</CardTitle>
          <p className="text-sm text-ink-soft">{nombrePieza(pieza)}</p>
        </div>
        <button
          onClick={onCerrar}
          aria-label="Cerrar selección"
          className="rounded-full p-1.5 text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
        >
          <X size={14} weight="bold" />
        </button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Field label="Condición">
          <Select value={seleccion} onValueChange={(v) => setSeleccion(v as CondicionDiente)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPCIONES.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Nota (opcional)">
          <Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Detalle clínico…" />
        </Field>
        <Button onClick={() => onGuardar(pieza, seleccion, nota)} className="w-full">
          Guardar pieza
        </Button>
      </CardContent>
    </Card>
  );
}
