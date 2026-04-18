declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: unknown;
  }
}

// Allow importing plain CSS files and CSS modules in TypeScript
declare module '*.css';
declare module '*.scss';
declare module '*.sass';
declare module '*.less';

// For CSS modules with named exports
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}
declare module '*.module.sass' {
  const classes: { [key: string]: string };
  export default classes;
}
