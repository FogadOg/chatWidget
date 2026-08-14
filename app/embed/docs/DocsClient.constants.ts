import { MessageType } from './DocsClient.types'

/**
 * Iframe footprint requested for the collapsed docs search bar (see
 * components/DocsSearchBar). The loader clamps the width to the visitor's
 * viewport, so this is a maximum rather than a fixed size; the extra height
 * over the bar itself leaves room for its drop shadow and bottom offset.
 */
export const DOCS_SEARCH_BAR_SIZE = { width: 480, height: 88 } as const;

/**
 * Local id generator instead of nanoid: these ids are only React keys for the
 * placeholder greeting, and nanoid ships as ESM, which breaks any Jest suite
 * that reaches this module (node_modules aren't transformed).
 */
const localId = () => `docs-${Math.random().toString(36).slice(2, 10)}`;

export const initialMessages: MessageType[] = [
  {
    key: localId(),
    from: "agent",
    versions: [
      {
        id: localId(),
        content: "Hello! I'm your documentation agent. How can I help you today?",
      },
    ],
  },
];
