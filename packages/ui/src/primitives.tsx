"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary px-4 py-2.5 text-primary-foreground shadow-sm hover:bg-primary/90",
        outline: "border border-border bg-surface px-4 py-2.5 text-foreground hover:bg-muted",
        ghost: "px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground",
      },
      size: { default: "h-10", sm: "h-8 text-xs", icon: "size-9 p-0" },
    },
    defaultVariants: { size: "default", variant: "default" },
  },
);

export function Button({
  className,
  size,
  variant,
  ...properties
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ size, variant }), className)} {...properties} />;
}
export function Card({ className, ...properties }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-surface shadow-sm", className)}
      {...properties}
    />
  );
}
export function Badge({ className, ...properties }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground",
        className,
      )}
      {...properties}
    />
  );
}

export function Label({ className, ...properties }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-semibold", className)} {...properties} />;
}
export function Input({ className, ...properties }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:bg-muted disabled:text-muted-foreground",
        className,
      )}
      {...properties}
    />
  );
}
export function Textarea({
  className,
  ...properties
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:bg-muted disabled:text-muted-foreground",
        className,
      )}
      {...properties}
    />
  );
}
export function Select({ className, ...properties }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:bg-muted disabled:text-muted-foreground",
        className,
      )}
      {...properties}
    />
  );
}

export function Dialog({
  children,
  trigger,
}: {
  readonly children: ReactNode;
  readonly trigger: ReactNode;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/35 backdrop-blur-sm data-[state=open]:animate-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-2xl">
          {children}
          <DialogPrimitive.Close
            className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function Drawer({
  children,
  trigger,
}: {
  readonly children: ReactNode;
  readonly trigger: ReactNode;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/35 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 w-[min(92vw,28rem)] border-l border-border bg-surface p-6 shadow-2xl">
          {children}
          <DialogPrimitive.Close
            className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Close drawer"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
