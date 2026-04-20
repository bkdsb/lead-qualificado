import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'default' | 'sm' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Exact mapping of Resend's premium restraint
    const baseClasses = "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-6 disabled:pointer-events-none disabled:opacity-50"
    
    const variants = {
      primary: "bg-primary text-primary-inverse shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-neutral-200 active:scale-[0.98]",
      secondary: "bg-surface-elevated text-slate-9 border border-white/[0.08] shadow-sm hover:bg-slate-3 hover:border-white/[0.12] active:scale-[0.98]",
      ghost: "text-slate-8 hover:text-slate-9 hover:bg-slate-2",
      danger: "bg-[#e5484d] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-[#c9393e] active:scale-[0.98]",
    }
    
    const sizes = {
      default: "h-9 px-4 py-2 rounded-md",
      sm: "h-8 px-3 rounded-md text-xs",
      icon: "h-9 w-9 rounded-md",
    }

    return (
      <Comp
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
