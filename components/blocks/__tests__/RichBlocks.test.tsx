import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RichBlocks from '../RichBlocks';
import type { BlockTheme } from '../types';
import type { RichBlock, RichCard } from '../../../types/widget';
import { RICH_BLOCK_SCHEMA_VERSION } from '../../../lib/constants';

const theme: BlockTheme = {
  textColor: '#111827',
  mutedTextColor: 'rgba(17,24,39,0.6)',
  borderColor: 'rgba(17,24,39,0.12)',
  surfaceColor: 'rgba(17,24,39,0.04)',
  primaryColor: '#2563eb',
  onPrimaryColor: '#ffffff',
  cardRadius: 8,
  buttonRadius: 6,
  fontStyles: {},
};

const card: RichCard = {
  title: 'Merino Crew Sweater',
  subtitle: 'Lightweight, machine washable',
  image: { url: 'https://cdn.example/sweater.jpg', alt: 'A grey sweater' },
  meta: [{ label: 'Price', value: '$129' }],
  actions: [
    { id: 'a1', kind: 'link', label: 'View product', url: 'https://shop.example/p/merino' },
    { id: 'a2', kind: 'reply', label: 'Does it come in navy?', payload: 'Does it come in navy?' },
  ],
};

function renderBlocks(blocks: RichBlock[], over: Partial<React.ComponentProps<typeof RichBlocks>> = {}) {
  const onAction = jest.fn();
  const utils = render(
    <RichBlocks
      content={{ v: RICH_BLOCK_SCHEMA_VERSION, blocks }}
      theme={theme}
      locale="en"
      messageId="m1"
      onAction={onAction}
      {...over}
    />
  );
  return { ...utils, onAction };
}

describe('RichBlocks — render contract', () => {
  it('renders nothing without content', () => {
    const { container } = render(
      <RichBlocks content={null} theme={theme} locale="en" messageId="m1" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a schema version it does not know', () => {
    // The guard that lets the schema change without old widgets half-rendering
    // transcripts already in the database.
    const { container } = render(
      <RichBlocks
        content={{ v: RICH_BLOCK_SCHEMA_VERSION + 1, blocks: [{ type: 'card', ...card }] }}
        theme={theme}
        locale="en"
        messageId="m1"
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an empty block list', () => {
    const { container } = renderBlocks([]);
    expect(container).toBeEmptyDOMElement();
  });

  it('skips an unknown block type but keeps the rest', () => {
    const { container } = renderBlocks([
      { type: 'video', url: 'https://x.example/v.mp4' } as unknown as RichBlock,
      { type: 'card', title: 'Still here' },
    ]);
    expect(screen.getByText('Still here')).toBeInTheDocument();
    expect(container.querySelectorAll('video')).toHaveLength(0);
  });
});

describe('RichBlocks — card', () => {
  it('renders title, subtitle, meta and image', () => {
    renderBlocks([{ type: 'card', ...card }]);
    expect(screen.getByText('Merino Crew Sweater')).toBeInTheDocument();
    expect(screen.getByText('Lightweight, machine washable')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('$129')).toBeInTheDocument();
    expect(screen.getByAltText('A grey sweater')).toHaveAttribute('src', 'https://cdn.example/sweater.jpg');
  });

  it('falls back to the card title for image alt text', () => {
    renderBlocks([{ type: 'card', title: 'Deluxe Room', image: { url: 'https://cdn.example/r.jpg' } }]);
    expect(screen.getByAltText('Deluxe Room')).toBeInTheDocument();
  });

  it('collapses the image slot when the image fails to load', () => {
    // Card images come from merchant CDNs we don't control. A broken-image icon
    // inside a product card reads as a broken product.
    renderBlocks([{ type: 'card', ...card }]);
    const image = screen.getByAltText('A grey sweater');
    fireEvent.error(image);
    expect(screen.queryByAltText('A grey sweater')).not.toBeInTheDocument();
    // The rest of the card survives — title, price and CTA are still a card.
    expect(screen.getByText('Merino Crew Sweater')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View product/ })).toBeInTheDocument();
  });

  it('renders a card with only a title', () => {
    renderBlocks([{ type: 'card', title: 'Just a title' }]);
    expect(screen.getByText('Just a title')).toBeInTheDocument();
  });
});

describe('RichBlocks — actions', () => {
  it('renders a link action as a safe external anchor', () => {
    renderBlocks([{ type: 'card', ...card }]);
    const link = screen.getByRole('link', { name: /View product/ });
    expect(link).toHaveAttribute('href', 'https://shop.example/p/merino');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('reports the action and its message context to the handler', () => {
    const { onAction } = renderBlocks([{ type: 'card', ...card }]);
    fireEvent.click(screen.getByRole('button', { name: /Does it come in navy/ }));
    expect(onAction).toHaveBeenCalledTimes(1);
    const [action, context] = onAction.mock.calls[0];
    expect(action.id).toBe('a2');
    expect(action.payload).toBe('Does it come in navy?');
    expect(context).toEqual({ messageId: 'm1', blockIndex: 0 });
  });

  it('disables a reply action once taken so a double-tap cannot resend it', () => {
    const { onAction } = renderBlocks([{ type: 'card', ...card }]);
    const button = screen.getByRole('button', { name: /Does it come in navy/ });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('leaves link actions clickable — opening a page twice is harmless', () => {
    const { onAction } = renderBlocks([{ type: 'card', ...card }]);
    const link = screen.getByRole('link', { name: /View product/ });
    fireEvent.click(link);
    fireEvent.click(link);
    expect(onAction).toHaveBeenCalledTimes(2);
  });

  it('renders a standalone button row', () => {
    const { onAction } = renderBlocks([{
      type: 'buttons',
      buttons: [
        { id: 'b1', kind: 'reply', label: 'Show me rooms', payload: 'Show me rooms' },
        { id: 'b2', kind: 'conversion', label: 'I booked', conversion_goal: 'booking' },
      ],
    }]);
    fireEvent.click(screen.getByRole('button', { name: 'I booked' }));
    expect(onAction.mock.calls[0][0].conversion_goal).toBe('booking');
    expect(screen.getByRole('button', { name: 'Show me rooms' })).toBeInTheDocument();
  });

  it('does not throw when no action handler is supplied', () => {
    render(
      <RichBlocks
        content={{ v: RICH_BLOCK_SCHEMA_VERSION, blocks: [{ type: 'card', ...card }] }}
        theme={theme}
        locale="en"
        messageId="m1"
      />
    );
    expect(() => fireEvent.click(screen.getByRole('button', { name: /navy/ }))).not.toThrow();
  });
});

describe('RichBlocks — carousel', () => {
  const items: RichCard[] = [
    { title: 'Room A', actions: [{ id: 'r1', kind: 'link', label: 'Book A', url: 'https://h.example/a' }] },
    { title: 'Room B' },
    { title: 'Room C' },
  ];

  beforeEach(() => {
    // jsdom has no scroll implementation.
    (HTMLElement.prototype as unknown as { scrollBy: jest.Mock }).scrollBy = jest.fn();
  });

  it('renders every item', () => {
    renderBlocks([{ type: 'carousel', items }]);
    expect(screen.getByText('Room A')).toBeInTheDocument();
    expect(screen.getByText('Room B')).toBeInTheDocument();
    expect(screen.getByText('Room C')).toBeInTheDocument();
  });

  it('exposes localized, labelled scroll controls', () => {
    renderBlocks([{ type: 'carousel', items }]);
    expect(screen.getByRole('group')).toHaveAttribute('aria-roledescription', 'Card carousel');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    const scrollBy = (HTMLElement.prototype as unknown as { scrollBy: jest.Mock }).scrollBy;
    expect(scrollBy).toHaveBeenCalledTimes(2);
    expect(scrollBy.mock.calls[0][0].left).toBeGreaterThan(0);
    expect(scrollBy.mock.calls[1][0].left).toBeLessThan(0);
  });

  it('animates the scroll unless reduced motion is requested', () => {
    const scrollBy = (HTMLElement.prototype as unknown as { scrollBy: jest.Mock }).scrollBy;
    renderBlocks([{ type: 'carousel', items }]);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(scrollBy.mock.calls[0][0].behavior).toBe('smooth');

    render(
      <RichBlocks
        content={{ v: RICH_BLOCK_SCHEMA_VERSION, blocks: [{ type: 'carousel', items }] }}
        theme={{ ...theme, reducedMotion: true }}
        locale="en"
        messageId="m2"
      />
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Next' })[1]);
    expect(scrollBy.mock.calls[1][0].behavior).toBe('auto');
  });

  it('dispatches actions from inside a carousel item with the right block index', () => {
    const { onAction } = renderBlocks([
      { type: 'card', title: 'First block' },
      { type: 'carousel', items },
    ]);
    fireEvent.click(screen.getByRole('link', { name: /Book A/ }));
    expect(onAction.mock.calls[0][1]).toEqual({ messageId: 'm1', blockIndex: 1 });
  });
});

describe('RichBlocks — image and links', () => {
  it('renders a standalone image', () => {
    renderBlocks([{ type: 'image', url: 'https://cdn.example/room.jpg', alt: 'Deluxe room' }]);
    expect(screen.getByAltText('Deluxe room')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('wraps a linked image in a safe external anchor', () => {
    renderBlocks([{
      type: 'image',
      url: 'https://cdn.example/room.jpg',
      alt: 'Deluxe room',
      link: 'https://hotel.example/rooms/deluxe',
    }]);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://hotel.example/rooms/deluxe');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('collapses a standalone image that fails to load', () => {
    renderBlocks([{ type: 'image', url: 'https://cdn.example/gone.jpg', alt: 'Gone' }]);
    fireEvent.error(screen.getByAltText('Gone'));
    expect(screen.queryByAltText('Gone')).not.toBeInTheDocument();
  });

  it('renders a link list with external-safe anchors', () => {
    const { onAction } = renderBlocks([{
      type: 'links',
      items: [
        { label: 'Size guide', url: 'https://x.example/sizes' },
        { label: 'Returns', url: 'https://x.example/returns' },
      ],
    }]);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
    fireEvent.click(links[1]);
    expect(onAction.mock.calls[0][0].url).toBe('https://x.example/returns');
    expect(onAction.mock.calls[0][0].kind).toBe('link');
  });
});
