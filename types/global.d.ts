declare module 'jest-axe';

declare module 'react-markdown' {
  const ReactMarkdown: any;
  export default ReactMarkdown;
}

declare module 'remark-gfm' {
  const plugin: any;
  export default plugin;
}

declare global {
  interface Window {
    CompaninWidget?: any;
    CompaninDocsWidget?: any;
  }

  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}

export {};
