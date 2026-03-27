'use client';
// Dynamic head elements for the embed session page
// Accepts query parameters from the loader script and injects CSS/JS

import React from 'react';
import { sanitizeCss } from '../../../lib/cssValidator';

type HeadProps = {
  searchParams: {
    customCss?: string;
    [key: string]: unknown;
  };
};

export default function Head({ searchParams }: HeadProps) {
  const { customCss } = searchParams;
  const safeCss = sanitizeCss(customCss ? decodeURIComponent(customCss as string) : undefined);

  return (
    <>
      {safeCss && (
        <style
          dangerouslySetInnerHTML={{ __html: safeCss }}
        />
      )}
    </>
  );
}
