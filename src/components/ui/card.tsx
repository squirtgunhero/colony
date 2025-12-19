import * as React from "react"

import { cn } from "@/lib/utils"

interface CardProps extends React.ComponentProps<"div"> {
  interactive?: boolean;
  selected?: boolean;
}

function Card({ className, interactive = false, selected = false, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground rounded-2xl",
        // Refined border - hairline, barely visible
        "border border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)]",
        // Subtle elevation
        "shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.04)]",
        "dark:shadow-[0_2px_4px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.02)]",
        // Interactive variant
        interactive && [
          "transition-all duration-200 ease-out cursor-pointer",
          "hover:translate-y-[-2px]",
          "hover:shadow-[0_8px_24px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.03)]",
          "hover:border-[rgba(0,0,0,0.06)]",
          "dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)]",
          "dark:hover:border-[rgba(255,255,255,0.08)]",
        ],
        // Selected state
        selected && [
          "ring-2 ring-primary/20 border-primary/20",
        ],
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("p-6 pb-4", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-title", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-caption mt-1", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("ml-auto", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("p-6 pt-0", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
