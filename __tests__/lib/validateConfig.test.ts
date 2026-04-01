import { validateConfig, inferWidgetType } from 'lib/validateConfig'

describe('validateConfig', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  test('inferWidgetType defaults to chat', () => {
    const inferred = inferWidgetType({})
    expect(inferred).toBe('chat')
  })

  test('validateConfig sanitizes chat-only fields when expectedType is docs (prod)', () => {
    process.env.NODE_ENV = 'production'

    const raw = {
      id: 'x',
      widget_type: 'chat',
      greeting_message: 'hi',
      start_open: true,
    }

    const res = validateConfig(raw as any, 'docs')
    expect(res.typeMismatch).toBe(true)
    // chat-only fields should be stripped for docs runtime
    expect((res.config as any).greeting_message).toBeUndefined()
    expect((res.config as any).start_open).toBeUndefined()
  })

  test('validateConfig in dev throws on mismatch', () => {
    process.env.NODE_ENV = 'development'
    const raw = { id: 'y', widget_type: 'docs' }
    expect(() => validateConfig(raw as any, 'chat')).toThrow()
  })

  test('missing widget_type is inferred and no mismatch when expected matches inferred', () => {
    process.env.NODE_ENV = 'production'
    const raw = { id: 'z', greeting_message: 'hello' }
    const res = validateConfig(raw as any, 'chat')
    expect(res.typeMismatch).toBe(false)
    expect(res.config.widget_type).toBe('chat')
  })

  test('missing widget_type + expected docs strips chat fields', () => {
    process.env.NODE_ENV = 'production'
    const raw = { id: 'w', greeting_message: 'hello', start_open: true }
    const res = validateConfig(raw as any, 'docs')
    expect(res.typeMismatch).toBe(true)
    expect((res.config as any).greeting_message).toBeUndefined()
  })
})
