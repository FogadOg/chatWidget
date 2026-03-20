import React from 'react'

export const Source: React.FC<any> = ({ href, title }) => <a href={href}>{title}</a>
export const Sources: React.FC<any> = ({ children }) => <div>{children}</div>
export const SourcesContent: React.FC<any> = ({ children }) => <div>{children}</div>
export const SourcesTrigger: React.FC<any> = ({ count }) => <button>{count}</button>

export default Sources
