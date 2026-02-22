import * as React from "react"

import { cn } from "@/lib/utils"

interface CardProps extends React.ComponentProps<"div"> {
  interactive?: boolean;
  selected?: boolean;
}

function Card({ className, interactive = false, selected = false, style, ...props }: CardProps & { style?: React.CSSProperties }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground rounded-2xl",
        "border",
        interactive && [
          "transition-all duration-200 ease-out cursor-pointer",
          "hover:translate-y-[-2px]",
        ],
        selected && [
          "ring-2 ring-primary/20 border-primary/20",
        ],
        className
      )}
      style={{
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-sm)",
        ...style,
      }}
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
