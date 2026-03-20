import React from "react";

export const DropdownMenu = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const DropdownMenuContent = (props: any) => <div {...props} />;
// Attach onSelect to onClick for tests to simulate selection
export const DropdownMenuItem = ({ onSelect, children, ...props }: any) => (
  <div
    {...props}
    onClick={(e) => {
      if (onSelect) onSelect({ preventDefault: () => {}, nativeEvent: e });
    }}
  >
    {children}
  </div>
);
export const DropdownMenuTrigger = ({ children, asChild, ...props }: any) => (
  <div {...props}>{children}</div>
);

export default DropdownMenu;
