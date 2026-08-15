/**
 * Tests for the docs widget's collapsed launcher card
 * (app/embed/docs/components/DocsSearchBar) — the surface that stands in for
 * the chat widget's launcher button + teaser bubble.
 *
 * The behaviors worth pinning: every way into the panel (click the card, type,
 * press Enter, pick a suggestion) carries the visitor's query across; the "×"
 * retires the bar without also opening it; and the card reports its own
 * footprint so the loader can shrink-wrap the iframe around it.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DocsSearchBar } from '../app/embed/docs/components/DocsSearchBar';
import type { DocsTheme } from '../app/embed/docs/DocsClient.types';

const theme = {
  vars: { '--primary': '#3b82f6' } as React.CSSProperties,
  panelBackground: '#ffffff',
  title: '#111827',
  subtitle: '#6b7280',
  border: '#e5e7eb',
} as DocsTheme;

function renderBar(props: Partial<React.ComponentProps<typeof DocsSearchBar>> = {}) {
  const onOpen = jest.fn();
  const onDismiss = jest.fn();
  const utils = render(
    <DocsSearchBar
      placeholder="Ask the docs"
      theme={theme}
      activeLocale="en"
      onOpen={onOpen}
      onDismiss={onDismiss}
      {...props}
    />,
  );
  return { onOpen, onDismiss, ...utils };
}

/** The card is the click target; the input carries its accessible name. */
const card = () => screen.getByRole('textbox').closest('.docs-search-bar') as HTMLElement;

describe('DocsSearchBar', () => {
  it('renders the configured placeholder as both placeholder and accessible name', () => {
    renderBar();
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Ask the docs');
    expect(input).toHaveAccessibleName('Ask the docs');
  });

  it('falls back to the localized default label when no placeholder is configured', () => {
    renderBar({ placeholder: '' });
    expect(screen.getByRole('textbox')).toHaveAccessibleName('Search articles…');
  });

  it('opens the panel with no seed when the card is clicked', () => {
    const { onOpen } = renderBar();
    fireEvent.click(card());
    expect(onOpen).toHaveBeenCalledWith();
  });

  it('hands the first keystroke to the panel rather than dropping it', () => {
    const { onOpen } = renderBar();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'refunds' } });
    expect(onOpen).toHaveBeenCalledWith('refunds');
  });

  it('opens with the typed query on Enter', () => {
    const { onOpen } = renderBar();
    const input = screen.getByRole('textbox') as HTMLInputElement;
    input.value = 'how do I embed it';
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledWith('how do I embed it');
  });

  it('ignores other keys', () => {
    const { onOpen } = renderBar();
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'a' });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('retires the bar on dismiss without opening the panel', () => {
    const { onOpen, onDismiss } = renderBar();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalled();
    // stopPropagation keeps the card's own click handler from also firing.
    expect(onOpen).not.toHaveBeenCalled();
  });

  describe('suggestion chips', () => {
    it('renders the configured suggestions in order and asks the picked one', () => {
      const onSuggestionSelect = jest.fn();
      const { onOpen } = renderBar({
        suggestions: ['How do I install it?', 'Pricing?'],
        onSuggestionSelect,
      });

      const chips = screen.getAllByRole('button', { name: /\?$/ });
      expect(chips.map((c) => c.textContent)).toEqual(['How do I install it?', 'Pricing?']);

      fireEvent.click(chips[1]);
      expect(onSuggestionSelect).toHaveBeenCalledWith('Pricing?');
      // stopPropagation again — picking a chip is not a bare card click.
      expect(onOpen).not.toHaveBeenCalled();
    });

    it('falls back to onOpen when no suggestion handler is supplied', () => {
      const { onOpen } = renderBar({ suggestions: ['Pricing?'] });
      fireEvent.click(screen.getByRole('button', { name: 'Pricing?' }));
      expect(onOpen).toHaveBeenCalledWith('Pricing?');
    });

    it('drops blank and non-string entries', () => {
      renderBar({ suggestions: ['  ', '', 'Real one', null as never, 42 as never] });
      const chips = screen.queryAllByRole('button').filter((b) => b.className.includes('__chip'));
      expect(chips).toHaveLength(1);
      expect(chips[0]).toHaveTextContent('Real one');
    });

    it('renders no chip row at all when there are no suggestions', () => {
      renderBar({ suggestions: [] });
      expect(
        screen.queryAllByRole('button').filter((b) => b.className.includes('__chip')),
      ).toHaveLength(0);
    });
  });

  describe('footprint reporting', () => {
    const origRO = global.ResizeObserver;
    const origRect = HTMLElement.prototype.getBoundingClientRect;

    afterEach(() => {
      global.ResizeObserver = origRO;
      HTMLElement.prototype.getBoundingClientRect = origRect;
    });

    function stubRect(height: number, width = 480) {
      HTMLElement.prototype.getBoundingClientRect = jest.fn(
        () => ({ width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}) }),
      ) as never;
    }

    it('reports the content size plus the wrapper padding', () => {
      stubRect(72.2, 479.4);
      const onMeasure = jest.fn();
      renderBar({ onMeasure });
      // Ceil of the rect + 16px padding on each side.
      expect(onMeasure).toHaveBeenCalledWith({ width: 480 + 32, height: 73 + 32 });
    });

    it('ignores a zero height (not laid out yet / jsdom)', () => {
      stubRect(0);
      const onMeasure = jest.fn();
      renderBar({ onMeasure });
      expect(onMeasure).not.toHaveBeenCalled();
    });

    it('does nothing when the host passed no onMeasure', () => {
      stubRect(72);
      expect(() => renderBar()).not.toThrow();
    });

    it('re-reports when the observed element resizes', () => {
      stubRect(72);
      let trigger: (() => void) | undefined;
      global.ResizeObserver = class {
        constructor(cb: () => void) { trigger = cb; }
        observe() {}
        disconnect() {}
      } as never;

      const onMeasure = jest.fn();
      renderBar({ onMeasure });
      expect(onMeasure).toHaveBeenCalledTimes(1);

      stubRect(140);
      act(() => { trigger?.(); });
      expect(onMeasure).toHaveBeenLastCalledWith({ width: 512, height: 172 });
    });

    it('disconnects the observer on unmount', () => {
      stubRect(72);
      const disconnect = jest.fn();
      global.ResizeObserver = class {
        observe() {}
        disconnect = disconnect;
      } as never;

      const { unmount } = renderBar({ onMeasure: jest.fn() });
      unmount();
      expect(disconnect).toHaveBeenCalled();
    });

    it('still renders where ResizeObserver is unavailable', () => {
      stubRect(72);
      // @ts-expect-error — deliberately removing the global for this case.
      delete global.ResizeObserver;
      const onMeasure = jest.fn();
      expect(() => renderBar({ onMeasure })).not.toThrow();
      // The one-shot measurement still happens; only the observer is skipped.
      expect(onMeasure).toHaveBeenCalled();
    });
  });

  describe('positioning', () => {
    it('fills the bar-sized iframe by default', () => {
      renderBar();
      const wrapper = card().parentElement?.parentElement as HTMLElement;
      expect(wrapper).toHaveStyle({ position: 'fixed', height: '100%' });
    });

    it('lays out in normal flow when static', () => {
      renderBar({ positioning: 'static' });
      const wrapper = card().parentElement?.parentElement as HTMLElement;
      expect(wrapper).toHaveStyle({ position: 'relative', height: 'auto' });
    });
  });
});
