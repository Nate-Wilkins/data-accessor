import { create as createPromise } from '../../test/promiseManual';
import { createCache, createHook } from './create_hook';
import {
  AccessorQueryCacheStore,
  AccessorQueryConfiguration,
  AccessorQueryResult,
} from './types';

export type Book = {
  id: string;
  title: string;
  authorId: string;
};

export type Response<T> = {
  status: number;
  data?: T | null | undefined;
  error?: string | undefined;
};

export type RequestBook = {
  id: string;
};

export type ResponseBook = {
  book: Book;
};

export interface CacheStore extends AccessorQueryCacheStore {
  books: Map<string, Book>;
}

/*
 * Creates a cache store.
 */
export const createCacheStore = (): CacheStore => {
  const cache = {
    ...createCache(setter => {
      setter(cache);
    }),
    books: new Map<string, Book>(),
  };

  return cache;
};

/*
 * Create an accessor query configuration.
 *
 * Parts of the configuration can be overwritten when provided as arguments.
 */
export const createQueryConfiguration = (overrides: {
  cache?: Partial<
    AccessorQueryConfiguration<
      CacheStore,
      RequestBook,
      ResponseBook,
      Book
    >['cache']
  >;
  constraints?: Partial<
    AccessorQueryConfiguration<
      CacheStore,
      RequestBook,
      ResponseBook,
      Book
    >['constraints']
  >;
  query?: AccessorQueryConfiguration<
    CacheStore,
    RequestBook,
    ResponseBook,
    Book
  >['query'];
}): AccessorQueryConfiguration<CacheStore, RequestBook, ResponseBook, Book> => {
  return {
    debug: false,
    constraints: {
      ...overrides.constraints,
    },
    cache: {
      duration: 1000 * 60, // 1min
      isPrimableFromCache: true,
      id: ({ args }) => `getBook#id#${args.id}`,
      set: ({ cache, response }): { data: Book } => {
        const store = cache();

        // Parse.
        const book = response.data.book;

        // Set cache.
        store.books.set(book.id, book);

        return { data: book };
      },
      get: ({ cache, args }): AccessorQueryResult<Book> | null => {
        const store = cache();

        // Get cache.
        const cacheResult = store.books.get(args.id);

        // Do we have a cache result?
        if (typeof cacheResult !== 'undefined') {
          return { data: cacheResult };
        }

        return null;
      },
      ...overrides.cache,
    } as AccessorQueryConfiguration<
      CacheStore,
      RequestBook,
      ResponseBook,
      Book
    >['cache'],
    query: overrides.query
      ? (overrides.query as AccessorQueryConfiguration<
          CacheStore,
          RequestBook,
          ResponseBook,
          Book
        >['query'])
      : async (args: RequestBook): Promise<Response<ResponseBook>> => {
          return createPromise<Response<ResponseBook>>(
            { resolve: true },
            {
              status: 200,
              data: { book: { id: args.id, title: 'My Book', authorId: '3' } },
            },
          );
        },
  };
};

/*
 * Resolve any thrown promises that occur.
 */
const resolveSuspense = async (callback: () => void) => {
  try {
    callback();
  } catch (ePromise: any) {
    if (ePromise.then) {
      await ePromise;
      callback();
    } else {
      throw ePromise;
    }
  }
};

test('when using a accessor query hook without an initial cache result, then the query should execute', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response.
  const data = { book: { id: '0', title: 'My Book', authorId: '3' } };
  const query = jest.fn(() =>
    createPromise<Response<ResponseBook>>(
      { resolve: true },
      {
        status: 200,
        data,
      },
    ),
  );

  // And a accessor query configuration.
  // And the cache result is *not* initially available.
  const configuration = createQueryConfiguration({
    query,
  });
  const hook = createHook(configuration);

  await resolveSuspense(() => {
    // When using the accessor hook.
    const result = hook(() => cache, { id: '0' });
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    // Then the result data is correct.
    expect(result.data).toBe(data.book);
  });

  // Then the query did execute.
  expect(query).toHaveBeenCalledWith({ id: '0' });
});

test('when using a accessor query hook with an initial cache result and isPrimableFromCache is on, then the query should *not* execute', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response.
  const data = {
    book: {
      id: '0',
      title: 'My Cached Book',
      authorId: '4',
    },
  };
  const query = jest.fn(() =>
    createPromise<Response<ResponseBook>>(
      { resolve: true },
      {
        status: 200,
        data,
      },
    ),
  );

  // And the cache result is initially available.
  cache.books.set('0', data.book);

  // And a accessor query configuration.
  const configuration = createQueryConfiguration({
    cache: {
      // And isPrimableFromCache is turned on.
      isPrimableFromCache: true,
    },
    query,
  });
  const hook = createHook(configuration);

  await resolveSuspense(() => {
    // When using the accessor hook.
    const result = hook(() => cache, { id: '0' });
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    // Then the result data is correct.
    expect(result.data).toBe(data.book);
  });

  // Then the query did *not* execute.
  expect(query).not.toHaveBeenCalled();
});

test('when using a accessor query hook with an initial cache result and isPrimableFromCache is off, then the query should execute', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response.
  const data = {
    book: {
      id: '0',
      title: 'My Book',
      authorId: '3',
    },
  };
  const query = jest.fn(() =>
    createPromise<Response<ResponseBook>>(
      { resolve: true },
      {
        status: 200,
        data,
      },
    ),
  );

  // And the cache result is initially available.
  cache.books.set('0', {
    id: '0',
    title: 'My Cached Book',
    authorId: '4',
  });

  // And a accessor query configuration.
  const configuration = createQueryConfiguration({
    cache: {
      // And isPrimableFromCache is turned off.
      isPrimableFromCache: false,
    },
    query,
  });
  const hook = createHook(configuration);

  await resolveSuspense(() => {
    // When using the accessor hook.
    const result = hook(() => cache, { id: '0' });
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.

    // Then the result data is correct.
    expect(result.data).toBe(data.book);
  });

  // Then the query did *not* execute.
  expect(query).toHaveBeenCalled();
});

test('when using a accessor query hook with a query that errors, then the query error should be thrown', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response that errors.
  const query = jest.fn(() =>
    createPromise<Response<ResponseBook>>(
      { resolve: true },
      new Error('Network call error.'),
    ),
  );

  // And a accessor query configuration.
  const configuration = createQueryConfiguration({
    query,
  });
  const hook = createHook(configuration);

  const promiseExecute = resolveSuspense(() => {
    // When using the accessor hook.
    const result = hook(() => cache, { id: '0' });
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.
  });

  // Then the query response error is thrown.
  await expect(promiseExecute).rejects.toThrow(/Network call error\./);

  // Then the query did execute.
  expect(query).toHaveBeenCalled();
});

test('when using a accessor query hook with a query response of a non-200 status code, then an error should be thrown', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response with a non-200 status code.
  const data = {
    book: {
      id: '0',
      title: 'My Book',
      authorId: '3',
    },
  };
  const query = jest.fn(() =>
    createPromise<Response<ResponseBook>>(
      { resolve: true },
      {
        status: 500,
        data,
      },
    ),
  );

  // And a accessor query configuration.
  const configuration = createQueryConfiguration({
    query,
  });
  const hook = createHook(configuration);

  const promiseExecute = resolveSuspense(() => {
    // When using the accessor hook.
    const result = hook(() => cache, { id: '0' });

    // Then the result data is correct.
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.
  });

  // Then the query response error is thrown.
  await expect(promiseExecute).rejects.toThrow(/\(500\) Response failed\./);

  // Then the query did execute.
  expect(query).toHaveBeenCalled();
});

test('when using a accessor query hook with a query response of a 200 status code and an error text, then an error should be thrown', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response with a 200 status code.
  // And a query response with a error text
  const query = jest.fn(() =>
    createPromise<Response<ResponseBook>>(
      { resolve: true },
      {
        status: 200,
        error: 'A validation error occurred.',
      },
    ),
  );

  // And a accessor query configuration.
  const configuration = createQueryConfiguration({
    query,
  });
  const hook = createHook(configuration);

  const promiseExecute = resolveSuspense(() => {
    // When using the accessor hook.
    const result = hook(() => cache, { id: '0' });

    // Then the result data is correct.
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.
  });

  // Then the query response error is thrown.
  await expect(promiseExecute).rejects.toThrow(
    /\(200\) Response failed: A validation error occurred\./,
  );

  // Then the query did execute.
  expect(query).toHaveBeenCalled();
});

test('when using a accessor query hook with a query response that takes longer than the maxDelay with enforce on, then an error timeout should be thrown', async () => {
  // Given a cache store.
  const cache = createCacheStore();

  // And a query response with a non-200 status code.
  // And the query response takes longer than the maxDelay.
  const data = {
    book: {
      id: '0',
      title: 'My Book',
      authorId: '3',
    },
  };
  const resolver = { resolve: true };
  const query = jest.fn(() => {
    return createPromise<Response<ResponseBook>>(resolver, {
      status: 200,
      data,
    });
  });

  // And a accessor query configuration.
  const configuration = createQueryConfiguration({
    constraints: { enforce: true, maxDelay: 1 },
    query,
  });
  const hook = createHook(configuration);

  const promiseExecute = resolveSuspense(() => {
    // When using the accessor hook.
    const result = hook(() => cache, { id: '0' });

    // Then the result data is correct.
    JSON.stringify(result.data); // Need to "evaluate" the proxy if it is one.
  });

  // Then the query response error is thrown.
  await expect(promiseExecute).rejects.toThrow(
    /Data accessor 'mockConstructor' with id 'getBook#id#0' timed out./,
  );

  // Then the query did execute.
  expect(query).toHaveBeenCalled();
});
