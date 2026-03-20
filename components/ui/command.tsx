import React from "react";

export const Command = ({ children, className }: any) => (
  <div className={className}>{children}</div>
);
export const CommandInput = (props: any) => <input {...props} />;
export const CommandList = (props: any) => <div {...props} />;
export const CommandEmpty = (props: any) => <div {...props} />;
export const CommandGroup = (props: any) => <div {...props} />;
export const CommandItem = (props: any) => <div {...props} />;
export const CommandSeparator = (props: any) => <div {...props} />;
export const CommandDialog = (props: any) => <div {...props} />;
export const CommandShortcut = (props: any) => <span {...props} />;

export default Command;
