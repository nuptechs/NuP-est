/**
 * HINT/TOOLTIP COMPONENT
 * 
 * Sistema encapsulado de tooltips reutilizável.
 * Baseado em Radix UI Tooltip para acessibilidade e UX.
 * 
 * USO:
 * import { HINTS } from '@/config/hints';
 * 
 * <Hint content={HINTS.voice.basic}>
 *   <Button>Elemento com hint</Button>
 * </Hint>
 * 
 * FEATURES:
 * - Posicionamento automático (top, bottom, left, right)
 * - Animação suave
 * - Acessível (ARIA)
 * - Delay configurável
 * - Design minimalista moderno
 */

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@nup/ui";

interface HintProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  className?: string;
}

export function Hint({
  children,
  content,
  side = "top",
  align = "center",
  delayDuration = 300,
  className,
}: HintProps) {
  if (!content) {
    return <>{children}</>;
  }

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={0}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            className={cn(
              "z-50 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-lg border",
              "px-3 py-2 text-sm font-medium",
              "animate-in fade-in-0 zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
              "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
              className
            )}
            sideOffset={8}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
