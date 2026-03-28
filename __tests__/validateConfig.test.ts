import { validateConfig, inferWidgetType } from '../lib/validateConfig';

const baseConfig = {
  id: 'cfg-1',
  primary_color: '#000',
  secondary_color: '#fff',
  background_color: '#fff',
  text_color: '#000',
  border_radius: 8,
  start_open: false,
  hide_on_mobile: false,
  title: { en: 'Test' },
  subtitle: { en: 'Test' },
  placeholder: { en: 'Test' },
  greeting_message: { text: { en: 'Hi' }, buttons: [] },
  default_language: 'en',
  font_family: 'Inter',
  font_size: 14,
  font_weight: 'normal',
  shadow_intensity: 'md',
  shadow_color: '#000',
  widget_width: 350,
  widget_height: 600,
  button_size: 'md',
  message_bubble_radius: 8,
  button_border_radius: 6,
  opacity: 1,
  position: 'bottom-right' as const,
  edge_offset: 20,
};

describe('inferWidgetType', () => {
  it('returns chat when greeting_message is present', () => {
    expect(inferWidgetType({ greeting_message: { text: { en: 'Hi' } } })).toBe('chat');
  });

  it('returns chat when start_open is present', () => {
    expect(inferWidgetType({ start_open: false })).toBe('chat');
  });

  it('returns chat when show_unread_badge is present', () => {
    expect(inferWidgetType({ show_unread_badge: true })).toBe('chat');
  });

  it('returns chat as default fallback', () => {
    expect(inferWidgetType({})).toBe('chat');
  });
});

describe('validateConfig', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  it('accepts a chat config for chat runtime', () => {
    const config = { ...baseConfig, widget_type: 'chat' as const };
    const result = validateConfig(config, 'chat');
    expect(result.widget_type).toBe('chat');
    expect(result.id).toBe('cfg-1');
  });

  it('accepts a docs config for docs runtime', () => {
    const config = { ...baseConfig, widget_type: 'docs' as const };
    const result = validateConfig(config, 'docs');
    expect(result.widget_type).toBe('docs');
  });

  it('strips chat-only fields when type is docs', () => {
    const config = { ...baseConfig, widget_type: 'docs' as const };
    const result = validateConfig(config, 'docs') as any;
    expect(result.start_open).toBeUndefined();
    expect(result.hide_on_mobile).toBeUndefined();
    expect(result.greeting_message).toBeUndefined();
    expect(result.show_timestamps).toBeUndefined();
    expect(result.show_typing_indicator).toBeUndefined();
    expect(result.show_message_avatars).toBeUndefined();
    expect(result.show_unread_badge).toBeUndefined();
    expect(result.position).toBeUndefined();
    expect(result.edge_offset).toBeUndefined();
  });

  it('preserves non-chat fields for docs runtime', () => {
    const config = { ...baseConfig, widget_type: 'docs' as const };
    const result = validateConfig(config, 'docs');
    expect(result.id).toBe('cfg-1');
    expect(result.primary_color).toBe('#000');
    expect(result.font_family).toBe('Inter');
  });

  it('infers missing widget_type and logs deprecation warning', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { widget_type: _, ...configWithoutType } = baseConfig as any;
    validateConfig(configWithoutType, 'chat');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('missing widget_type')
    );
  });

  it('warns (not throws) in production on type mismatch', () => {
    process.env.NODE_ENV = 'production';
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const config = { ...baseConfig, widget_type: 'chat' as const };
    // Chat config loaded by docs runtime — should warn in prod, not throw
    expect(() => validateConfig(config, 'docs')).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Type mismatch')
    );
  });

  it('throws in development on type mismatch', () => {
    process.env.NODE_ENV = 'development';
    const config = { ...baseConfig, widget_type: 'chat' as const };
    expect(() => validateConfig(config, 'docs')).toThrow('Type mismatch');
  });
});
