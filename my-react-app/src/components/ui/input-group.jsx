import * as React from "react"
import { cn } from "../../lib/utils"

const InputGroup = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("relative flex items-center", className)}
      {...props}
    />
  )
})
InputGroup.displayName = "InputGroup"

const InputLeftElement = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("absolute left-3 flex items-center text-neutral-500", className)}
      {...props}
    >
      {children}
    </div>
  )
})
InputLeftElement.displayName = "InputLeftElement"

export { InputGroup, InputLeftElement }

