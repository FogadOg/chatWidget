import { nanoid } from 'nanoid'
import { MessageType } from './DocsClient.types'

/**
 * Iframe footprint requested for the collapsed docs search bar (see
 * components/DocsSearchBar). The loader clamps the width to the visitor's
 * viewport, so this is a maximum rather than a fixed size; the extra height
 * over the bar itself leaves room for its drop shadow and bottom offset.
 */
export const DOCS_SEARCH_BAR_SIZE = { width: 480, height: 88 } as const;

export const initialMessages: MessageType[] = [
  {
    key: nanoid(),
    from: "agent",
    versions: [
      {
        id: nanoid(),
        content: "Hello! I'm your documentation agent. How can I help you today?",
      },
    ],
  },
];
