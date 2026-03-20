import React from "react";

export const Progress = ({ value, className }: any) => (
  <div data-testid="progress" data-value={value} className={className} />
);

export default Progress;
