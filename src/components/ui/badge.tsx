import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-indigo-600 text-white shadow-sm hover:bg-indigo-700",
        secondary:
          "border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200",
        destructive:
          "border-rose-200 bg-rose-50 text-rose-700 font-semibold",
        outline: "text-slate-800 border-slate-300 bg-white",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold",
        warning:
          "border-amber-200 bg-amber-50 text-amber-800 font-semibold",
        info:
          "border-blue-200 bg-blue-50 text-blue-700 font-semibold",
        purple:
          "border-purple-200 bg-purple-50 text-purple-700 font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
