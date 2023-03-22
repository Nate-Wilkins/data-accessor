import { ConfigurationQuery } from '../src/query';
import { create as createPromise } from './promise_manual';

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

export interface CacheStore {
  books: Map<string, Book>;
}

/*
 * Creates a cache store for testing.
 */
export const createCacheStore = (): CacheStore => {
  const cacheStore = {
    books: new Map<string, Book>(),
  };

  return cacheStore;
};

/*
 * Create a query configuration for testing.
 *
 * Parts of the configuration can be overwritten when provided as arguments.
 */
export const createConfiguration = (
  cache: CacheStore,
  overrides: {
    cache?: Partial<
      ConfigurationQuery<RequestBook, ResponseBook, Book>['cache']
    >;
    suspense?: ConfigurationQuery<RequestBook, ResponseBook, Book>['suspense'];
    queryRequest?: ConfigurationQuery<
      RequestBook,
      ResponseBook,
      Book
    >['queryRequest'];
    queryRequestMore?: ConfigurationQuery<
      RequestBook,
      ResponseBook,
      Book
    >['queryRequestMore'];
  },
): ConfigurationQuery<RequestBook, ResponseBook, Book> => {
  return {
    debug: true,
    // TODO:
    // constraints: {
    //   ...overrides.constraints,
    // },
    cache: {
      ttl: 1000 * 60, // 1min
      isPrimable: true,
      id: ({ args }) => `getBook#id#${args.id}`,
      set: ({ response }): { data: Book } => {
        // Parse.
        const book = response.data.book;

        // Set cache.
        cache.books.set(book.id, book);

        return { data: book };
      },
      get: ({ args }) => {
        // Get cache.
        const cacheResult = cache.books.get(args.id);

        // Do we have a cache result?
        if (typeof cacheResult !== 'undefined') {
          return { data: cacheResult };
        }

        return null;
      },
      clear: ({ args }): void => {
        cache.books.delete(args.id);
      },
      ...overrides.cache,
    } as ConfigurationQuery<RequestBook, ResponseBook, Book>['cache'],
    ...(overrides.suspense
      ? { suspense: { cache: overrides.suspense.cache } }
      : {}),
    queryRequest: overrides.queryRequest
      ? (overrides.queryRequest as ConfigurationQuery<
          RequestBook,
          ResponseBook,
          Book
        >['queryRequest'])
      : async (args: RequestBook): Promise<Response<ResponseBook>> => {
          return createPromise<Response<ResponseBook>>({
            status: 200,
            data: { book: { id: args.id, title: 'My Book', authorId: '3' } },
          });
        },
    queryRequestMore: overrides.queryRequestMore as ConfigurationQuery<
      RequestBook,
      ResponseBook,
      Book
    >['queryRequestMore'],
  };
};
