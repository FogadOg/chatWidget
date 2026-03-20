import React from "react";

export const Dialog: React.FC<any> = ({ children }) => <div>{children}</div>;
export const DialogContent: React.FC<any> = ({ children, ...props }) => (
  <div data-testid="dialog-content" {...props}>{children}</div>
);
export const DialogHeader: React.FC<any> = ({ children }) => <div>{children}</div>;
export const DialogTitle: React.FC<any> = ({ children }) => <h2>{children}</h2>;
export const DialogDescription: React.FC<any> = ({ children, asChild, ...props }: any) => (
  asChild ? (children as any) : <p {...props}>{children}</p>
);
export const DialogFooter: React.FC<any> = ({ children }) => <div>{children}</div>;
export const DialogClose: React.FC<any> = ({ children }) => <button>{children}</button>;

export default Dialog;
