/**
 * Get a default value.
 */
export const getDefaultValue = <T,>(
  value: T | null | undefined,
  defaultValue: T,
): T => {
  if (typeof value !== 'undefined' && value !== null) {
    return value;
  } else {
    return defaultValue;
  }
};
