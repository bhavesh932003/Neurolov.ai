import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Variants defined with improved outline and focus
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gray-900 text-gray-50 hover:bg-gray-900/80",
        secondary:
          "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80",
        destructive:
          "border-transparent bg-red-500 text-gray-50 hover:bg-red-500/80",
        outline:
          "border-gray-200 text-gray-900 hover:bg-gray-100", // ✅ Proper outline styling
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, // ✅ Use <span> for inline badges
    VariantProps<typeof badgeVariants> {
  asStatus?: boolean; // Optional prop for accessibility
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, asStatus = false, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      role={asStatus ? "status" : undefined} // ✅ Add role=status if it's a dynamic badge
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
