import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Adaptación local de Radix para cierre accesible y protección de la escritura. */
export function FileUploadDialog({ open, subiendo, title, description, onClose, onReturnFocus, children }: {
  open: boolean; subiendo: boolean; title: string; description: string;
  onClose: () => void; onReturnFocus: () => void; children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(abierto) => { if (!abierto && !subiendo) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="overlay-animate fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className="dialog-animate fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-[28px] border border-white/50 bg-white/75 p-4 shadow-diffuse backdrop-blur-2xl focus:outline-none sm:p-6"
          onEscapeKeyDown={(evento) => { if (subiendo) evento.preventDefault(); }}
          onInteractOutside={(evento) => { if (subiendo) evento.preventDefault(); }}
          onCloseAutoFocus={(evento) => { evento.preventDefault(); onReturnFocus(); }}
        >
          <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-lg font-semibold text-ink">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-ink-muted">{description}</DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="ghost" size="icon" className="shrink-0" disabled={subiendo} aria-label="Cerrar formulario de subida"><X size={20} aria-hidden /></Button>
            </DialogPrimitive.Close>
          </div>
          {subiendo ? <p role="status" className="mb-3 text-sm text-ink-muted">Subiendo y registrando archivo…</p> : null}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
