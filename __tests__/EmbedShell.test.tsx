import React from 'react';
import '@testing-library/jest-dom';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import EmbedShell from '../components/EmbedShell';

jest.mock('../hooks/useWidgetTranslation', () => ({
  useWidgetTranslation: () => ({ translations: { chat: 'Chat', typeYourMessage: 'Type...', send: 'Send' } })
}));

describe('EmbedShell - logo and avatar', () => {
  it('renders header logo and assistant avatar when provided', () => {
    const widgetConfig: any = {
      title: { en: 'My Bot' },
      subtitle: { en: 'Sub' },
      primary_color: '#111111',
      background_color: '#ffffff',
      text_color: '#111111',
      border_radius: 8,
      font_family: 'Inter',
      font_size: 14,
      font_weight: 'normal',
      shadow_intensity: 'md',
      shadow_color: '#000000',
      widget_width: 350,
      widget_height: 600,
      button_size: 'md',
      message_bubble_radius: 8,
      button_border_radius: 6,
      opacity: 1,
      logo: 'https://example.com/logo.png',
      bot_avatar: 'https://example.com/avatar.png',
      greeting_message: { text: { en: 'Hi' }, buttons: [] },
    };

    const messages = [
      { id: 'm1', text: 'Hello from assistant', from: 'assistant' },
      { id: 'm2', text: 'User reply', from: 'user' }
    ];

    render(
      <EmbedShell
        isEmbedded={false}
        isCollapsed={false}
        toggleCollapsed={() => {}}
        messages={messages}
        isTyping={false}
        input={''}
        setInput={() => {}}
        handleSubmit={() => {}}
        widgetConfig={widgetConfig}
      />
    );

    // header logo should be rendered
    expect(screen.getByAltText(/logo/)).toBeInTheDocument();

    // assistant avatar should be rendered (there may be multiple avatar images)
    const avatars = screen.getAllByAltText(/avatar/);
    expect(avatars.length).toBeGreaterThan(0);
  });
});
