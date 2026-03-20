import React from "react";

export const Collapsible = ({ children, open }: any) => (
  <div data-open={open}>{children}</div>
);

export const CollapsibleTrigger = ({ children, ...props }: any) => (
  <button {...props}>{children}</button>
);

export const CollapsibleContent = ({ children }: any) => <div>{children}</div>;

export default Collapsible;
