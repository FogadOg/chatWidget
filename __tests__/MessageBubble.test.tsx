import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import MessageBubble from '../components/MessageBubble'

jest.mock('../hooks/useWidgetTranslation', () => ({ useWidgetTranslation: () => ({ locale: 'en', translations: {} }) }))
jest.mock('../lib/i18n', () => ({ t: (_: any, key: string) => key }))

describe('MessageBubble', () => {
  test('renders assistant message with avatar, sources, feedback buttons and timestamp', () => {
    const msg = { id: 'm1', text: 'hello', from: 'assistant', timestamp: Date.now(), sources: [{ url: 'https://a', title: 'Title', snippet: 'snippet text' }] }
    const onFeedback = jest.fn()
    render(<MessageBubble message={msg as any} widgetConfig={{ bot_avatar: 'https://img' } as any} assistantName="Bot" onSubmitMessageFeedback={onFeedback} />)
    expect(screen.getByText('hello')).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
    // click thumbs up (first button)
    const btns = screen.getAllByRole('button')
    fireEvent.click(btns[0])
    expect(onFeedback).toHaveBeenCalled()
  })

  test('renders user message branch', () => {
    const msg = { id: 'u1', text: 'me', from: 'user', timestamp: Date.now() }
    render(<MessageBubble message={msg as any} />)
    expect(screen.getByText('me')).toBeInTheDocument()
  })
})
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import MessageBubble from '../components/MessageBubble'

describe('MessageBubble', () => {
  test('renders assistant message with sources and feedback buttons', () => {
    const msg = {
      id: 'm1',
      text: 'Hello',
      from: 'assistant',
      timestamp: Date.now(),
      sources: [{ url: 'http://a', title: 'A', snippet: 'sometext' }]
    }

    const onFeedback = jest.fn()
    render(<MessageBubble message={msg as any} onSubmitMessageFeedback={onFeedback} messageFeedbackSubmitted={new Set()} />)

    expect(screen.getByText('Hello')).toBeInTheDocument()
    // feedback buttons should be present
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
    // click thumbs up (first button)
    fireEvent.click(buttons[0])
    expect(onFeedback).toHaveBeenCalled()
  })

  test('renders user message', () => {
    const msg = { id: 'u1', text: 'User text', from: 'user', timestamp: Date.now() }
    render(<MessageBubble message={msg as any} />)
    expect(screen.getByText('User text')).toBeInTheDocument()
  })

  test('assistant message with no sources and feedback already submitted', () => {
    const msg = { id: 'm2', text: 'Assist no sources', from: 'assistant' }
    render(<MessageBubble message={msg as any} messageFeedbackSubmitted={new Set(['m2'])} showMessageAvatars={false} showTimestamps={false} />)
    expect(screen.getByText('Assist no sources')).toBeInTheDocument()
    // no buttons should be shown because feedback submitted
    const btns = screen.queryAllByRole('button')
    expect(btns.length).toBe(0)
  })
})
