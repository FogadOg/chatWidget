import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

jest.mock('../hooks/useWidgetTranslation', () => ({
  useWidgetTranslation: () => ({
    translations: {
      copy: 'Copy',
      copied: 'Copied!',
      copyCodeSnippet: 'Copy code snippet',
    },
  }),
}));

// shiki is async — just resolve to empty string so HighlightedCode falls back to plain <pre>
jest.mock('shiki', () => ({
  codeToHtml: jest.fn().mockResolvedValue(''),
}));

import FrameworkTabs from '../app/[locale]/docs/getting-started/FrameworkTabs';

describe('FrameworkTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders all framework tabs', () => {
    render(<FrameworkTabs />);

    expect(screen.getByText('HTML / JS')).toBeInTheDocument();
    expect(screen.getByText('Next.js')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Angular')).toBeInTheDocument();
    expect(screen.getByText('Vue')).toBeInTheDocument();
  });

  it('shows HTML/JS snippet by default', () => {
    render(<FrameworkTabs />);

    expect(screen.getByText(/widget\.companin\.tech\/widget\.js/)).toBeInTheDocument();
  });

  it('switches to Next.js snippet on tab click', () => {
    render(<FrameworkTabs />);

    fireEvent.click(screen.getByText('Next.js'));

    expect(screen.getByText(/app\/layout\.tsx/)).toBeInTheDocument();
  });

  it('switches to React snippet on tab click', () => {
    render(<FrameworkTabs />);

    fireEvent.click(screen.getByText('React'));

    expect(screen.getByText(/src\/App\.tsx/)).toBeInTheDocument();
  });

  it('switches to Angular snippet on tab click', () => {
    render(<FrameworkTabs />);

    fireEvent.click(screen.getByText('Angular'));

    expect(screen.getByText(/app\.component\.ts/)).toBeInTheDocument();
  });

  it('switches to Vue snippet on tab click', () => {
    render(<FrameworkTabs />);

    fireEvent.click(screen.getByText('Vue'));

    expect(screen.getByText(/src\/App\.vue/)).toBeInTheDocument();
  });

  it('renders Copy button', () => {
    render(<FrameworkTabs />);

    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('copies snippet to clipboard and shows Copied! feedback', async () => {
    render(<FrameworkTabs />);

    await act(async () => {
      fireEvent.click(screen.getByText('Copy'));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('accepts custom snippets override', () => {
    render(<FrameworkTabs snippets={{ 'HTML / JS': 'custom-snippet-content' }} />);

    expect(screen.getByText('custom-snippet-content')).toBeInTheDocument();
  });

  it('merges custom snippets with defaults', () => {
    render(<FrameworkTabs snippets={{ 'HTML / JS': 'custom-html' }} />);

    // HTML/JS shows custom
    expect(screen.getByText('custom-html')).toBeInTheDocument();

    // Next.js tab still has default snippet
    fireEvent.click(screen.getByText('Next.js'));
    expect(screen.getByText(/app\/layout\.tsx/)).toBeInTheDocument();
  });
});
