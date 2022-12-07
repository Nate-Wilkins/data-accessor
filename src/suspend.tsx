/*
 * Suspends a provided promise for `React.Suspense`.
 *
 * Creating suspense!
 *
 * @returns () => T
 *   Used to get the state of a suspended promise.
 *   It's important to recognize that this is needed so that `React.ErrorBoundary` works correctly.
 *   Only because this function will throw the promise error if there was one.
 *   Otherwise react won't know about the error.
 */
export const suspend = <T,>(promise: Promise<T>) => {
  let result: T;
  let status = 'pending';
  const suspender = promise.then(
    response => {
      status = 'success';
      result = response;
    },
    error => {
      status = 'error';
      result = error;
    },
  );

  return (): T => {
    switch (status) {
      case 'pending':
        throw suspender;
      case 'error':
        throw result;
      default:
        return result;
    }
  };
};
