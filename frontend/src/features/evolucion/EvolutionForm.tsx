import { useState, type FormEvent } from "react";
import { FloppyDisk, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NextVisitPicker } from "./NextVisitPicker";
import { hoyEnIso } from "./fechasEvolucion";
import type { BorradorEvolucion, EvolucionClinica } from "./tipos.ts";

/** Rango aceptado para `numero_pieza`: un entero entre 0 y 32. */
const PIEZA_MINIMO = 0;
const PIEZA_MAXIMO = 32;

type Errores = Partial<Record<"motivoConsulta" | "procedimientoRealizado" | "numeroPieza", string>>;

const BORDADOR_VACIO: BorradorEvolucion = {
  motivoConsulta: "",
  procedimientoRealizado: "",
  observaciones: "",
  indicaciones: "",
  proximaAtencion: null,
  numeroPieza: null,
};

/**
 * Convierte el texto del campo pieza en número.
 * Devuelve `null` si está vacío y `NaN` si no es un entero válido: `NaN` no
 * puede viajar en la base de datos, así que la validación lo detecta antes.
 */
function interpretarPieza(texto: string): number | null {
  if (texto.trim() === "") return null;
  return Number(texto.trim());
}

function validar(borrador: BorradorEvolucion, pieza: string): Errores {
  const errores: Errores = {};
  if (!borrador.motivoConsulta.trim()) {
    errores.motivoConsulta = "Indica el motivo de la consulta.";
  }
  if (!borrador.procedimientoRealizado.trim()) {
    errores.procedimientoRealizado = "Indica el procedimiento realizado.";
  }
  const numero = interpretarPieza(pieza);
  if (numero !== null && !Number.isInteger(numero)) {
    errores.numeroPieza = `La pieza debe ser un número entero entre ${PIEZA_MINIMO} y ${PIEZA_MAXIMO}.`;
  } else if (numero !== null && (numero < PIEZA_MINIMO || numero > PIEZA_MAXIMO)) {
    errores.numeroPieza = `La pieza debe estar entre ${PIEZA_MINIMO} y ${PIEZA_MAXIMO}.`;
  }
  return errores;
}

/**
 * Formulario de alta y edición de una evolución clínica.
 *
 * El componente es "controlado hacia arriba": no escribe en la base de datos,
 * entrega un `BorradorEvolucion` y quien lo usa decide si es una creación o una
 * edición. Para cambiar de registro hay que remontarlo con otra `key` (ver
 * `EvolutionTab`), de modo que el borrador nunca mezcle dos evoluciones.
 */
export function EvolutionForm({
  inicial,
  guardando,
  onGuardar,
  onCancelar,
}: {
  /** Evolución ya guardada. Si se omite, el formulario es de alta. */
  inicial?: EvolucionClinica;
  /** Bloquea el envío mientras la escritura está en curso. */
  guardando: boolean;
  onGuardar: (borrador: BorradorEvolucion) => void;
  onCancelar?: () => void;
}) {
  const [motivoConsulta, setMotivoConsulta] = useState(
    inicial?.motivoConsulta ?? BORDADOR_VACIO.motivoConsulta,
  );
  const [procedimientoRealizado, setProcedimientoRealizado] = useState(
    inicial?.procedimientoRealizado ?? BORDADOR_VACIO.procedimientoRealizado,
  );
  const [observaciones, setObservaciones] = useState(inicial?.observaciones ?? "");
  const [indicaciones, setIndicaciones] = useState(inicial?.indicaciones ?? "");
  const [proximaAtencion, setProximaAtencion] = useState<string | null>(
    inicial?.proximaAtencion ?? null,
  );
  // Se guarda como texto para que el campo pueda quedar vacío: un `Input`
  // numérico con `null` reacciona mal y no deja borrar el último dígito.
  const [pieza, setPieza] = useState(
    inicial?.numeroPieza === null || inicial?.numeroPieza === undefined
      ? ""
      : `${inicial.numeroPieza}`,
  );
  const [errores, setErrores] = useState<Errores>({});

  const idMotivo = "evolucion-motivo-consulta";
  const idProcedimiento = "evolucion-procedimiento-realizado";
  const idPieza = "evolucion-numero-pieza";

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;

    const borrador: BorradorEvolucion = {
      motivoConsulta: motivoConsulta.trim(),
      procedimientoRealizado: procedimientoRealizado.trim(),
      observaciones: observaciones.trim(),
      indicaciones: indicaciones.trim(),
      proximaAtencion,
      numeroPieza: interpretarPieza(pieza),
    };

    const encontrados = validar(borrador, pieza);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    onGuardar(borrador);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{inicial ? "Editar evolución" : "Nueva evolución"}</CardTitle>
        <CardDescription>
          {inicial
            ? "Los cambios se aplican a la atención ya registrada."
            : `Se registrará con la fecha de hoy (${hoyEnIso()}).`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* `noValidate`: los mensajes los pone este formulario, no el navegador,
            para que sean legibles y se anuncien junto al campo. */}
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          <Field
            label="Motivo de consulta"
            htmlFor={idMotivo}
            hint={errores.motivoConsulta ?? "Lo que refiere el paciente. Campo obligatorio."}
            labelClassName={errores.motivoConsulta ? "text-ios-red" : undefined}
          >
            <Input
              id={idMotivo}
              value={motivoConsulta}
              disabled={guardando}
              aria-invalid={errores.motivoConsulta ? true : undefined}
              onChange={(evento) => setMotivoConsulta(evento.target.value)}
              placeholder="Dolor al masticar"
            />
          </Field>

          <Field
            label="Procedimiento realizado"
            htmlFor={idProcedimiento}
            hint={errores.procedimientoRealizado ?? "Qué se hizo en esta consulta. Campo obligatorio."}
            labelClassName={errores.procedimientoRealizado ? "text-ios-red" : undefined}
          >
            <Input
              id={idProcedimiento}
              value={procedimientoRealizado}
              disabled={guardando}
              aria-invalid={errores.procedimientoRealizado ? true : undefined}
              onChange={(evento) => setProcedimientoRealizado(evento.target.value)}
              placeholder="Obturación con resina en molar superior derecho"
            />
          </Field>

          <Field
            label="Observaciones"
            htmlFor="evolucion-observaciones"
            hint="Hallazgos, minuto clínico y materiales usados. Opcional."
          >
            <Textarea
              id="evolucion-observaciones"
              value={observaciones}
              disabled={guardando}
              onChange={(evento) => setObservaciones(evento.target.value)}
              placeholder="Caries oclusal profunda, sin compromiso pulpar."
            />
          </Field>

          <Field
            label="Indicaciones"
            htmlFor="evolucion-indicaciones"
            hint="Lo que se le indica al paciente. Opcional."
          >
            <Textarea
              id="evolucion-indicaciones"
              value={indicaciones}
              disabled={guardando}
              onChange={(evento) => setIndicaciones(evento.target.value)}
              placeholder="Higiene con hilo dental. Evitar dulces duros por una semana."
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Número de pieza"
              htmlFor={idPieza}
              hint={
                errores.numeroPieza
                  ?? `Opcional. Entre ${PIEZA_MINIMO} y ${PIEZA_MAXIMO}.`
              }
              labelClassName={errores.numeroPieza ? "text-ios-red" : undefined}
            >
              <Input
                id={idPieza}
                type="number"
                inputMode="numeric"
                min={PIEZA_MINIMO}
                max={PIEZA_MAXIMO}
                step={1}
                value={pieza}
                disabled={guardando}
                aria-invalid={errores.numeroPieza ? true : undefined}
                onChange={(evento) => setPieza(evento.target.value)}
                placeholder="16"
              />
            </Field>

            <NextVisitPicker
              value={proximaAtencion}
              onChange={setProximaAtencion}
              min={hoyEnIso()}
              disabled={guardando}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            {onCancelar ? (
              <Button type="button" variant="ghost" onClick={onCancelar} disabled={guardando}>
                <X size={17} aria-hidden /> Cancelar
              </Button>
            ) : null}
            <Button type="submit" disabled={guardando}>
              <FloppyDisk size={17} aria-hidden />
              {guardando ? "Guardando…" : inicial ? "Guardar cambios" : "Guardar evolución"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
