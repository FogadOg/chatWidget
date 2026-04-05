// Ambient override to avoid consuming react-markdown's bundled TypeScript sources
// which can be incompatible with the project's TS settings during typecheck.
declare module 'react-markdown' {
  import * as React from 'react';
  const ReactMarkdown: React.ComponentType<any>;
  export default ReactMarkdown;
}
declare module 'react-markdown' {
  import * as React from 'react';
  const ReactMarkdown: React.ComponentType<unknown>;
  export default ReactMarkdown;
}
