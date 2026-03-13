declare module 'jest-axe';

declare module 'react-markdown' {
  const ReactMarkdown: unknown;
  export default ReactMarkdown;
}

declare module 'remark-gfm' {
  const plugin: unknown;
  export default plugin;
}

declare global {
  interface Window {
    CompaninWidget?: unknown;
    CompaninDocsWidget?: unknown;
  }

  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}

export {};
