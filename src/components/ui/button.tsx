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
    const baseClasses = "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-6 disabled:pointer-events-none disabled:opacity-50"
    
    const variants = {
      primary: "bg-white text-black hover:bg-neutral-200 active:scale-[0.98]",
      secondary: "bg-transparent text-slate-10 border border-white/[0.08] hover:bg-white/[0.04] active:scale-[0.98]",
      ghost: "text-slate-8 hover:text-slate-10 hover:bg-white/[0.04]",
      danger: "bg-[#e5484d] text-white hover:bg-[#c9393e] active:scale-[0.98]",
    }
    
    const sizes = {
      default: "h-8 px-3 rounded-md text-[13px]",
      sm: "h-7 px-2.5 rounded-md text-[12px]",
      icon: "h-8 w-8 rounded-md",
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
