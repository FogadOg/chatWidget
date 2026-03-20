import React from 'react'

export const Suggestion: React.FC<any> = ({ suggestion, onClick }) => (
  <button onClick={() => onClick && onClick(suggestion)}>{suggestion}</button>
)

export const Suggestions: React.FC<any> = ({ children }) => <div>{children}</div>

export default Suggestions
