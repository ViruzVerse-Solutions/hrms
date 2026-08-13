import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm hover:from-indigo-500 hover:to-indigo-600 hover:shadow-indigo-500/25",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
        outline:
          "border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 backdrop-blur-sm",
        ghost:
          "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200",
        destructive:
          "bg-rose-600 text-white hover:bg-rose-500 shadow-sm hover:shadow-rose-500/25",
        success:
          "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm hover:shadow-emerald-500/25",
        glass:
          "bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/20 dark:border-slate-700/30 text-slate-800 dark:text-slate-100 shadow-sm hover:bg-white/90 dark:hover:bg-slate-800/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-2xl px-6 text-base",
        icon: "h-9 w-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
