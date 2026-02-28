import { renderHook } from '@testing-library/react';
import { useWidgetStyles } from '../../hooks/useWidgetStyles';

const minimalConfig = {
  primary_color: '#112233',
  secondary_color: '#445566',
  background_color: '#778899',
  text_color: '#000000',
  border_radius: 10,
  font_family: 'Arial',
  font_size: 14,
  font_weight: '400',
  shadow_intensity: 'lg',
  shadow_color: '#000000',
  widget_width: 300,
  widget_height: 500,
  button_size: 'lg',
  message_bubble_radius: 8,
  button_border_radius: 6,
  opacity: 0.5,
  show_timestamps: false,
  show_typing_indicator: false,
  show_message_avatars: false,
  show_unread_badge: false,
};

describe('useWidgetStyles', () => {
  it('computes style values from config', () => {
    const { result } = renderHook(() => useWidgetStyles(minimalConfig as any));
    expect(result.current.primaryColor).toBe('#112233');
    expect(result.current.showTimestamps).toBe(false);
    expect(result.current.fontStyles.fontFamily).toBe('Arial');
    expect(result.current.getButtonSizeClasses.width).toBe('w-16');
  });

  it('falls back to defaults when config is undefined', () => {
    const { result } = renderHook(() => useWidgetStyles(undefined));
    expect(result.current.primaryColor).toBeDefined();
    expect(result.current.showTimestamps).toBe(true);
  });
});
