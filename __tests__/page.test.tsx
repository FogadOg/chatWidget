import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Home from '../app/page';

describe('Home Page', () => {
  it('renders the main heading', () => {
    render(<Home />);

    expect(screen.getByText('Companin Chat Widget')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<Home />);

    expect(screen.getByText('AI-powered chat widget for your website. Embed intelligent conversations anywhere with just a few lines of code.')).toBeInTheDocument();
  });

  it('renders Get Started button', () => {
    render(<Home />);

    const getStartedLink = screen.getByText('Get Started').closest('a');
    expect(getStartedLink).toHaveAttribute('href', '/docs/getting-started');
  });

  it('renders View Demo button', () => {
    render(<Home />);

    const viewDemoLink = screen.getByText('View Demo').closest('a');
    expect(viewDemoLink).toHaveAttribute('href', '/preview');
  });

  it('renders feature cards', () => {
    render(<Home />);

    expect(screen.getByText('Easy Integration')).toBeInTheDocument();
    expect(screen.getByText('Customizable')).toBeInTheDocument();
    expect(screen.getByText('Multi-language')).toBeInTheDocument();
  });

  it('renders with correct layout structure', () => {
    render(<Home />);

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass('flex', 'min-h-screen', 'w-full', 'max-w-3xl');
  });
});