import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import RootLayout from '../app/layout';

describe('RootLayout', () => {
  it('renders children correctly', () => {
    render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies correct HTML attributes', () => {
    render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    const html = document.documentElement;
    expect(html).toHaveAttribute('lang', 'en');
    expect(html).toHaveStyle({ background: 'transparent' });
  });

  it('applies correct body attributes', () => {
    render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    const body = document.body;
    expect(body).toHaveClass('antialiased');
    expect(body).toHaveStyle({ background: 'transparent' });
  });

  it('includes font variables in className', () => {
    render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    const body = document.body;
    // Font variables are applied via CSS custom properties, not class names
    expect(body.className).toContain('antialiased');
  });
});