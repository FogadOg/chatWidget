// mock ESM modules imported by the DocsClient module to avoid transform errors
jest.mock('react-markdown', () => (props: any) => require('react').createElement('div', {}, props.children))
jest.mock('remark-gfm', () => ({}))
jest.mock('nanoid', () => ({ nanoid: () => 'nid' }))
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
jest.mock('../hooks/useWidgetAuth', () => ({
  useWidgetAuth: () => ({ getAuthToken: jest.fn().mockResolvedValue('tok'), authToken: 'tok', authError: null }),
}))

import { getLocalizedText } from '../app/embed/docs/DocsClient'

describe('getLocalizedText (DocsClient)', () => {
  test('returns empty string for undefined', () => {
    expect(getLocalizedText(undefined, 'en')).toBe('')
  })

  test('returns value for requested locale', () => {
    const obj = { en: 'Hello', fr: 'Bonjour' }
    expect(getLocalizedText(obj, 'fr')).toBe('Bonjour')
  })

  test('falls back to en when requested locale missing', () => {
    const obj = { en: 'Hello', es: 'Hola' }
    expect(getLocalizedText(obj, 'de')).toBe('Hello')
  })

  test('returns first available when no en and requested missing', () => {
    const obj = { es: 'Hola', fr: 'Bonjour' }
    expect(getLocalizedText(obj, 'de')).toBe('Hola')
  })
})
