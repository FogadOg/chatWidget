/**
 * Extra page context supplied by the host page via
 * `CompaninDocsWidget.setContext({ plan: 'pro', … })`, merged into the
 * `page_context` sent with each message. Parity with the chat widget's
 * `pageContextRef` (EmbedClient.controller).
 *
 * Module-level rather than React state: each widget runs in its own iframe
 * document, and the value is only ever read at send time — keeping it out of
 * the render path avoids re-rendering the panel when the host updates context.
 */
let hostContext: Record<string, unknown> = {};

export function mergeHostContext(patch: Record<string, unknown>): void {
  // `action` is the command-routing field from the host message envelope, not
  // context the backend should see.
  const { action: _action, ...rest } = patch;
  hostContext = { ...hostContext, ...rest };
}

export function getHostContext(): Record<string, unknown> {
  return hostContext;
}

/** Drop host context — used when the host resets the conversation. */
export function clearHostContext(): void {
  hostContext = {};
}
