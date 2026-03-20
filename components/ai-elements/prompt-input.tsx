import React from 'react'

export const PromptInput: React.FC<any> = ({ children, onSubmit }) => {
  return <form onSubmit={(e) => { e.preventDefault(); if (onSubmit) onSubmit({ text: '' }); }}>{children}</form>
}

export const PromptInputHeader = ({ children }: any) => <div>{children}</div>
export const PromptInputBody = ({ children }: any) => <div>{children}</div>
export const PromptInputFooter = ({ children }: any) => <div>{children}</div>
export const PromptInputTextarea = ({ value, onChange, placeholder }: any) => (
  <textarea value={value} onChange={onChange} placeholder={placeholder} />
)
export const PromptInputAttachments = ({ children }: any) => <div>{children('attachment')}</div>
export const PromptInputAttachment = ({ data }: any) => <div>{String(data)}</div>
export const PromptInputSubmit = ({ disabled }: any) => <button disabled={disabled}>Send</button>
export const PromptInputTools = ({ children }: any) => <div>{children}</div>
export const PromptInputHeaderRow = ({ children }: any) => <div>{children}</div>

export type PromptInputMessage = { text?: string; files?: any[] }

export default PromptInput
