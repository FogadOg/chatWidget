// Utility functions for color manipulation and validation

// Validates a hex color and returns the normalized value or a fallback
export const normalizeHexColor = (color: string | undefined, fallback: string): string => {
  if (typeof color !== 'string') return fallback;
  const trimmed = color.trim();

  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
};

// Convert a 6‑digit hex code to "r, g, b" string. Returns white on failure.
export const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16
      )}`
    : '255, 255, 255';
};
