/**
 * Widget config validation module.
 *
 * Validates a raw config object against the expected widget_type.
 * - In development: throws on mismatch to surface problems early.
 * - In production: warns and returns a sanitized config with
 *   chat-only fields stripped when type is 'docs'.
 *
 * Legacy configs that omit widget_type are inferred from their content
 * and a deprecation warning is logged.
 */

import type { WidgetConfig } from '../types/widget';

/** Fields that are only meaningful for 'chat' widgets. */
const CHAT_ONLY_FIELDS: ReadonlyArray<keyof WidgetConfig> = [
  'start_open',
  'hide_on_mobile',
  'greeting_message',
  'show_timestamps',
  'show_typing_indicator',
  'show_message_avatars',
  'show_unread_badge',
  'position',
  'edge_offset',
  'edgeOffset',
];

const getIsDev = () => process.env.NODE_ENV === 'development';

/**
 * Infer widget_type from config fields when widget_type is absent.
 * Returns 'chat' as safe default.
 */
export function inferWidgetType(config: Partial<WidgetConfig>): 'chat' | 'docs' {
  // If it has chat-specific interactive fields, treat as chat.
  if (
    config.greeting_message !== undefined ||
    config.start_open !== undefined ||
    config.show_unread_badge !== undefined
  ) {
    return 'chat';
  }
  return 'chat'; // safe default; docs widgets should send widget_type explicitly
}

/**
 * Validate rawConfig against the expected expectedType.
 *
 * Returns a (possibly sanitized) config safe to use at runtime.
 * Throws in dev if there is a type mismatch; warns in prod.
 */
export function validateConfig(
  rawConfig: Partial<WidgetConfig>,
  expectedType: 'chat' | 'docs'
): WidgetConfig {
  // Infer type if missing (legacy config).
  let resolvedType = rawConfig.widget_type;
  if (!resolvedType) {
    resolvedType = inferWidgetType(rawConfig);
    console.warn(
      `[widget] Config "${rawConfig.id}" is missing widget_type. ` +
        `Inferred as "${resolvedType}". ` +
        'Set widget_type explicitly in your embed snippet to suppress this warning.'
    );
  }

  if (resolvedType !== expectedType) {
    const msg =
      `[widget] Type mismatch: config "${rawConfig.id}" has widget_type="${resolvedType}" ` +
      `but was loaded by the "${expectedType}" runtime.`;

    if (getIsDev()) {
      throw new Error(msg);
    }
    console.warn(msg);
  }

  // For docs runtime, strip chat-only fields to avoid confusing the runtime.
  let sanitized: Partial<WidgetConfig> = { ...rawConfig, widget_type: resolvedType };
  if (expectedType === 'docs') {
    for (const field of CHAT_ONLY_FIELDS) {
      delete (sanitized as Record<string, unknown>)[field as string];
    }
  }

  return sanitized as WidgetConfig;
}
