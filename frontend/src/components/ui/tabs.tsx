import * as TabsPrimitive from "@radix-ui/react-tabs";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { cn } from "@/lib/cn";

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    // UISegmentedControl: capsula gris con el segmento activo como pastilla
    // blanca encima, apoyada en una sombra en vez de un borde.
    className={cn(
      "inline-flex max-w-full items-center gap-0.5 overflow-x-auto overscroll-x-contain rounded-full bg-black/[0.05] p-1",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // `touch-pan-x`, no `touch-none`: el botón ocupa casi toda la franja de
      // `TabsList`, así que un `touch-action: none` ahí bloqueaba el scroll
      // horizontal nativo (`overflow-x-auto`) apenas el dedo tocaba un tab en
      // vez de el huequito entre ellos. `pan-x` deja el gesto horizontal al
      // navegador y sigue matando el doble-tap-zoom en el botón.
      "press touch-pan-x shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-label-2 transition-colors duration-150 ease-out data-[state=active]:bg-white data-[state=active]:text-label data-[state=active]:shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "outline-none data-[state=active]:animate-[fade-in-up_400ms_var(--ease-out-strong)_both]",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";
