/**
 * Callback limiter limits the callback from being called more than 'n' times.
 *
 * @param callback - Callback to wrap with limiter.
 * @param configuration.max - Number of times the callback can be called before the `defaultValue` is returned.
 *                            If less than or equal to 0, `callback` will always be called.
 * @param configuration.defaultValue - Data to return for when the `limit` is reached.
 * @param configuration.reset - Whether or not to reset limiter when `max` is exceeded.
 */
export const createCallbackLimiter = <T, K>(
  callback: () => T,
  configuration: { max: number; defaultValue: K; reset: boolean },
): { count: { current: number }; callback: () => T | K } => {
  // Configuration
  const cMax = configuration.max;
  const cDefaultValue = configuration.defaultValue;
  const cReset = configuration.reset;

  // State.
  const count = { current: 0 };

  const callbackLimiter = () => {
    let result: T | K;
    if (cMax <= 0 || count.current < cMax) {
      result = callback();
      count.current = count.current + 1;
    } else {
      result = cDefaultValue;
      if (cReset) {
        count.current = 0;
      }
    }
    return result;
  };

  return { count, callback: callbackLimiter };
};
