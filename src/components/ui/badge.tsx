import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'neutral'
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-slate-3 text-slate-9 border border-white/[0.04]",
    success: "bg-green-500/10 text-green-400 border border-green-500/10",
    warning: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/10",
    danger: "bg-red-500/10 text-red-400 border border-red-500/10",
    neutral: "bg-transparent text-slate-7 border border-slate-5",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
