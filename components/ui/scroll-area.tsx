import React from 'react'

export const ScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function ScrollArea(props, ref) {
  return <div ref={ref as any} {...props} />
})

export default ScrollArea
