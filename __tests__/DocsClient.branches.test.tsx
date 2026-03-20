import React from 'react'
// Mock auth hook so DocsClient fetches widget config during tests
jest.mock('../hooks/useWidgetAuth', () => ({
  useWidgetAuth: () => ({
    getAuthToken: jest.fn().mockResolvedValue('tok'),
    authToken: 'tok',
    authError: null,
  }),
}))
import { render, act, waitFor } from '@testing-library/react'
// Mock ESM modules that cause Jest parse issues
// Export the component directly so `require('react-markdown')` returns a callable component
jest.mock('react-markdown', () => (props: any) => React.createElement('div', {}, props.children))
jest.mock('remark-gfm', () => ({}))
jest.mock('use-stick-to-bottom', () => {
  const React = require('react')
  const Content = (props: any) => React.createElement('div', props, props.children)
  const StickToBottom: any = (props: any) => React.createElement('div', props, props.children)
  StickToBottom.Content = Content
  return {
    StickToBottom,
    useStickToBottomContext: () => ({ isAtBottom: true, scrollToBottom: jest.fn() }),
  }
})
import DocsClient from '../app/embed/docs/DocsClient'

// Provide a deterministic nanoid to keep keys stable
jest.mock('nanoid', () => ({ nanoid: () => 'nid' }))

describe('DocsClient targeted branches', () => {
  const origReferrer = document.referrer
  const origUA = navigator.userAgent
  const origFetch = global.fetch

  beforeEach(() => {
    // set parent origin via document.referrer
    Object.defineProperty(document, 'referrer', { value: 'https://parent.example/page', configurable: true })
    // mobile user agent to trigger hide_on_mobile branch
    // @ts-ignore
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3) AppleWebKit', configurable: true })

    // mock parent.postMessage
    // @ts-ignore
    window.parent = { postMessage: jest.fn() }

    global.fetch = jest.fn((input: RequestInfo, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/auth/widget-token')) {
        return Promise.resolve({ ok: true, json: async () => ({ token: 'tok' }) }) as any
      }
      if (url.includes('/widget-config/')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: { hide_on_mobile: true, title: { en: 'Docs' }, subtitle: { en: 'Help' } } }) }) as any
      }
      if (url.includes('/sessions/') && init && init.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({ status: 'success', data: { session_id: 's1', expires_at: new Date(Date.now() + 10000).toISOString() } } ) }) as any
      }
      if (url.includes('/sessions/') && (!init || init.method === 'GET')) {
        return Promise.resolve({ ok: true, json: async () => ({ status: 'success', data: { messages: [ { id: 'm1', sender: 'user', content: 'hi' }, { id: 'm2', sender: 'assistant', content: 'hello' } ] } }) }) as any
      }

      return Promise.resolve({ ok: true, json: async () => ({}) }) as any
    }) as any
  })

  afterEach(() => {
    // restore
    Object.defineProperty(document, 'referrer', { value: origReferrer, configurable: true })
    // @ts-ignore
    Object.defineProperty(navigator, 'userAgent', { value: origUA, configurable: true })
    global.fetch = origFetch
    // @ts-ignore
    window.parent = window
    jest.restoreAllMocks()
  })

  it('fetches config, posts hide/show and resize messages, and responds to OPEN/CLOSE messages', async () => {
    render(<DocsClient clientId="c" assistantId="a" configId="cfg" locale="en" startOpen={false} />)

    // wait for fetches and effects
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    // widgetConfig effect should call parent.postMessage for hide/show
    await waitFor(() => expect((window.parent as any).postMessage).toHaveBeenCalled())

    // simulate message from parent to open dialog
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'OPEN_DOCS_DIALOG' } }))
    })

    // after open, parent should receive WIDGET_RESIZE with 100vw/100vh
    await waitFor(() => expect((window.parent as any).postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'WIDGET_RESIZE' }), expect.any(String)))

    // simulate close
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'CLOSE_DOCS_DIALOG' } }))
    })

    await waitFor(() => expect((window.parent as any).postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'WIDGET_RESIZE' }), expect.any(String)))
  })

  it('falls back to default title when widgetConfig title is missing', async () => {
    // override fetch to return no title in widget config
    (global.fetch as jest.Mock) = jest.fn((input: RequestInfo, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/auth/widget-token')) {
        return Promise.resolve({ ok: true, json: async () => ({ token: 'tok' }) }) as any
      }
      if (url.includes('/widget-config/')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: { hide_on_mobile: false } }) }) as any
      }
      if (url.includes('/sessions/') && init && init.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({ status: 'success', data: { session_id: 's1', expires_at: new Date(Date.now() + 10000).toISOString() } } ) }) as any
      }
      if (url.includes('/sessions/') && (!init || init.method === 'GET')) {
        return Promise.resolve({ ok: true, json: async () => ({ status: 'success', data: { messages: [] } }) }) as any
      }
      return Promise.resolve({ ok: true, json: async () => ({}) }) as any
    }) as any

    const { getByText } = render(<DocsClient clientId="c" assistantId="a" configId="cfg" locale="en" startOpen={true} />)

    // wait for fetches and effects
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    // default title should be shown when no title provided
    await waitFor(() => expect(getByText('Documentation Assistant')).toBeTruthy())
  })
})
