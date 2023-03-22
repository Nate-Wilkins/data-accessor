/*
 * Create a promise that can be resolved manually with data or an error.
 */
export const create = async <T,>(dataOrError: Error | T): Promise<T> => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      clearInterval(interval);

      if (dataOrError instanceof Error) {
        console.log('[test.createPromise] rejected.');
        reject(dataOrError);
      } else {
        console.log('[test.createPromise] resolved.');
        resolve(dataOrError);
      }
    }, 1000);
  });
};
