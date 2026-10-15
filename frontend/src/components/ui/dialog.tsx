import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title: string; description?: string }
>(({ className, children, title, description, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="overlay-animate fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px]" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // `dvh`, no `vh`: en movil `vh` mide el viewport mas grande (barra del
        // navegador colapsada), asi que un modal fixed con `85vh` puede
        // quedar mas alto que el area realmente visible, con una punta
        // recortada por el borde de la pantalla y sin forma de scrollear
        // hasta ahi (el `overflow-y-auto` solo ayuda si el contenido interno
        // excede la caja, no si la caja misma excede el viewport real).
        "dialog-animate fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[28px] border border-white/50 bg-white/75 p-7 shadow-diffuse backdrop-blur-2xl focus:outline-none",
        className,
      )}
      {...props}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <DialogPrimitive.Title className="text-lg font-semibold text-ink">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-1 text-sm text-ink-muted">
              {description}
            </DialogPrimitive.Description>
          ) : null}
        </div>
        <DialogPrimitive.Close className="rounded-full p-1.5 text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
          <X size={16} weight="bold" />
        </DialogPrimitive.Close>
      </div>
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";
