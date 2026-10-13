import * as SelectPrimitive from "@radix-ui/react-select";
import { CaretDown, CaretUp, Check } from "@phosphor-icons/react";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { cn } from "@/lib/cn";
import { useFormTheme } from "@/components/ui/form-theme";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<
  ElementRef<typeof SelectPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const tema = useFormTheme();
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        // Mismo contrato que `Input`: `rounded-ios-lg`, `text-[16px]` y el anillo
        // de `focus-ring`. Antes era `rounded-xl` + `text-sm` + borde azul, por lo
        // que un select junto a un input se notaba como de otra aplicacion.
        "flex h-11 w-full items-center justify-between rounded-ios-lg border border-line-field bg-surface px-4 text-[16px] leading-6 text-ink shadow-[inset_0_1px_2px_rgba(22,35,58,0.04)] transition-colors duration-150 ease-out focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring data-[placeholder]:text-ink-muted",
        tema.control,
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <CaretDown size={14} weight="bold" className="text-ink-muted" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectScrollUpButton = forwardRef<
  ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex items-center justify-center py-1 text-ink-muted", className)}
    {...props}
  >
    <CaretUp size={13} weight="bold" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = "SelectScrollUpButton";

const SelectScrollDownButton = forwardRef<
  ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex items-center justify-center py-1 text-ink-muted", className)}
    {...props}
  >
    <CaretDown size={13} weight="bold" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = "SelectScrollDownButton";

export const SelectContent = forwardRef<
  ElementRef<typeof SelectPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={6}
      // Sin este max-height, una lista que no entra cerca del borde de la
      // ventana (p. ej. en un diálogo largo como "Invitar") se renderiza
      // parcialmente fuera de la pantalla y el último ítem queda
      // inalcanzable — justo lo que le pasaba al rol "Administrador".
        // El panel del desplegable es una superficie flotante: lleva la misma
        // elevacion que una tarjeta (`shadow-e2`) y el mismo radio (`rounded-panel`).
        // Antes usaba `shadow-diffuse`, que la hacia casi invisible sobre el fondo.
        className={cn(
          "z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-panel border border-ink/[0.08] bg-white/90 shadow-e2 backdrop-blur-xl data-[state=open]:animate-[fade-in-up_150ms_var(--ease-out-strong)_both]",
          className,
        )}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = forwardRef<
  ElementRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => {
  const tema = useFormTheme();
  return (
    <SelectPrimitive.Item
      ref={ref}
        // `rounded-tile` (14px) dentro de un panel de 18px: la jerarquia de radios
        // separates la fila del contenedor. El tinte de marca al pasar por la fila
        // hace que la opcion enfocada se distinga de la seleccionada. El contexto
        // del tema cruza el portal de Radix, asi que la fila tambien toma el
        // acento de la seccion.
        className={cn(
          "relative flex cursor-pointer select-none items-center rounded-tile py-2 pl-7 pr-3 text-[15px] text-ink outline-none data-[highlighted]:bg-brand-50",
          tema.item,
          className,
        )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check size={13} weight="bold" className="text-ink" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = "SelectItem";
