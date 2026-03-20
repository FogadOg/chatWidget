import React from "react";

export const Select = ({ children, ...props }: any) => <select {...props}>{children}</select>;
export const SelectContent = (props: any) => <div {...props} />;
export const SelectItem = (props: any) => <div {...props} />;
export const SelectTrigger = (props: any) => <button {...props} />;
export const SelectValue = (props: any) => <span {...props} />;

export default Select;
