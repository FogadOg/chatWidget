import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Home from '../app/page';

describe('Home Page', () => {
  it('renders the main heading', () => {
    render(<Home />);

    expect(screen.getByText('To get started, edit the page.tsx file.')).toBeInTheDocument();
  });

  it('renders Next.js logo', () => {
    render(<Home />);

    const logo = screen.getByAltText('Next.js logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/next.svg');
  });

  it('renders Vercel logo', () => {
    render(<Home />);

    const logo = screen.getByAltText('Vercel logomark');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/vercel.svg');
  });

  it('renders description text', () => {
    render(<Home />);

    expect(screen.getByText(/Looking for a starting point/)).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    render(<Home />);

    expect(screen.getByText('Deploy Now')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  it('has correct link attributes', () => {
    render(<Home />);

    const deployLink = screen.getByText('Deploy Now').closest('a');
    expect(deployLink).toHaveAttribute('href', expect.stringContaining('vercel.com'));
    expect(deployLink).toHaveAttribute('target', '_blank');
    expect(deployLink).toHaveAttribute('rel', 'noopener noreferrer');

    const docsLink = screen.getByText('Documentation').closest('a');
    expect(docsLink).toHaveAttribute('href', expect.stringContaining('nextjs.org'));
    expect(docsLink).toHaveAttribute('target', '_blank');
    expect(docsLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders with correct layout structure', () => {
    render(<Home />);

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass('flex', 'min-h-screen', 'w-full', 'max-w-3xl');
  });
});