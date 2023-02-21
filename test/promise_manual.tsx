/*
 * Create a promise that can be resolved manually with data or an error.
 */
export const create = async <T,>(
  resolver: { resolve: boolean },
  dataOrError: Error | T,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (!resolver.resolve) {
        return;
      }

      clearInterval(interval);

      if (dataOrError instanceof Error) {
        reject(dataOrError);
      } else {
        resolve(dataOrError);
      }
    }, 50);
  });
};
