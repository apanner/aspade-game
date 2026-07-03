import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Auto-capitalize first letter for name inputs (like mobile does)
      if (props.name === 'name' || props.id === 'name' || props.placeholder?.toLowerCase().includes('name')) {
        let value = e.target.value
        if (value.length > 0) {
          value = value.charAt(0).toUpperCase() + value.slice(1)
        }
        e.target.value = value
      }
      
      // Call original onChange if provided
      if (onChange) {
        onChange(e)
      }
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        suppressHydrationWarning={true}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
