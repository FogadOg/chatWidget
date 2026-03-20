import React from "react";

export const InputGroup = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const InputGroupAddon = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const InputGroupButton = ({ children, ...props }: any) => (
  <button {...props}>{children}</button>
);
export const InputGroupTextarea = (props: any) => <textarea {...props} />;

export default InputGroup;
