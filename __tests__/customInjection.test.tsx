import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import Head from '../app/embed/session/head';
import { injectCustomAssets, applyCustomAssetsFromQuery } from '../app/embed/session/EmbedClient';

// ensure document head is clean before each test
beforeEach(() => {
  document.head.innerHTML = '';
});

describe('head.tsx injection component', () => {
  it('renders style tag when customCss param provided', () => {
    const css = encodeURIComponent('body{color:blue;}');
    const { container } = render(<Head searchParams={{ customCss: css }} />);

    expect(container.querySelector('style')).toHaveTextContent('body{color:blue;}');
  });

  it('renders nothing when no relevant params', () => {
    const { container } = render(<Head searchParams={{}} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('injection helpers', () => {
  it('injectCustomAssets adds style to document head', () => {
    injectCustomAssets('h1{font-size:20px;}');
    const style = document.head.querySelector('style');
    expect(style).toBeTruthy();
    expect(style).toHaveTextContent('h1{font-size:20px;}');
  });

  it('applyCustomAssetsFromQuery reads from provided search string', () => {
    const search = '?customCss=' + encodeURIComponent('p{color:red;}');
    applyCustomAssetsFromQuery(search);
    expect(document.head.querySelector('style')).toHaveTextContent('p{color:red;}');
  });
});
