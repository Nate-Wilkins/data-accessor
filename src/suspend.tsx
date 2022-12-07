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
