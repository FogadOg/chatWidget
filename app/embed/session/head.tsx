'use client';
// Dynamic head elements for the embed session page
// Accepts query parameters from the loader script and injects CSS/JS

import React, { useEffect } from 'react';

type HeadProps = {
  searchParams: {
    customCss?: string;
    [key: string]: unknown;
  };
};

export default function Head({ searchParams }: HeadProps) {
  const { customCss } = searchParams;

  return (
    <>
      {customCss && (
        <style
          // the value is encoded by the loader; decode before using
          dangerouslySetInnerHTML={{ __html: decodeURIComponent(customCss) }}
        />
      )}
    </>
  );
}
