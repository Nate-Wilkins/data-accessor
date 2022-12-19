import { create as createPromise } from '../../test/promiseManual';
import { suspend } from './index';

test('when suspending a promise, then the status function should be created', async () => {
  // Given a promise.
  const resolver = { resolve: false };
  const data = { results: [] };
  const promise = createPromise(resolver, data);

  // When suspending the promise.
  const status = suspend(promise);

  // Then a status function is returned.
  expect(status).toBeDefined();
  expect(typeof status).toBe('function');

  // Cleanup.
  resolver.resolve = true;
  await promise;
});

test('when running a promise suspended status, the promise should be thrown', async () => {
  // Given a promise.
  const resolver = { resolve: false };
  const data = { results: [] };
  const promise = createPromise(resolver, data);

  // And the promise was suspended.
  const status = suspend(promise);

  try {
    // When running the promise suspended status.
    status();

    throw new Error('Status should have thrown.');
  } catch (ePromise: any) {
    // Then the promise was thrown.
    // eslint-disable-next-line jest/no-try-expect
    expect(ePromise.then).toBeDefined();
  }

  // Cleanup.
  resolver.resolve = true;
  await promise;
});

test('when running a promise suspended status that has completed, then the result should be returned', async () => {
  // Given a promise suspended.
  const resolver = { resolve: true };
  const data = { results: [] };
  const promise = createPromise(resolver, data);

  // And the promise was suspended.
  const status = suspend(promise);

  // And the promise completed.
  await promise;

  // When running the promise suspended status.
  const result = status();

  // Then the promise suspended status returns the result.
  expect(result).toBe(data);
});

test('when running a promise suspended status that has errored, then that error should be thrown', async () => {
  // Given a promise suspended.
  const resolver = { resolve: false };
  const error = new Error('Custom error.');
  const promise = createPromise(resolver, error);

  // And the promise was suspended.
  const status = suspend(promise);

  // And the promise has completed.
  const promiseExecuteResolve = async () => {
    resolver.resolve = true;
    await promise;
  };

  // And the prommise threw an error.
  await expect(promiseExecuteResolve).rejects.toThrow(error);

  // When running the promise suspended status.
  const promiseExecuteStatus = async () => {
    status();

    throw new Error('Status should have thrown.');
  };
  // Then the error was thrown correctly.
  await expect(promiseExecuteStatus).rejects.toThrow(error);
});
