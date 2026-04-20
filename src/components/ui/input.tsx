import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-white/[0.08] bg-slate-1 px-3 py-1 text-sm text-slate-10 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-6 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
