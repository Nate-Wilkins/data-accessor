import { render } from '@testing-library/react/pure';
import React, { FunctionComponent, ReactNode, Suspense } from 'react';
import { useErrorBoundary } from 'use-error-boundary';
import {
  AccessorQueryCacheStore,
  AccessorQueryConfiguration,
  AccessorQueryResultCacheSetResult,
} from '../src/query';
import { createCache } from '../src/query/create_cache';
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

export interface CacheStore extends AccessorQueryCacheStore {
  books: Map<string, Book>;
}

/*
 * Creates a cache store.
 */
export const createCacheStore = (): CacheStore => {
  const cacheStore = {
    ...createCache(setter => {
      setter(cacheStore);
    }),
    books: new Map<string, Book>(),
  };

  return cacheStore;
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
      get: ({
        cache,
        args,
      }): AccessorQueryResultCacheSetResult<Book> | null => {
        const store = cache();

        // Get cache.
        const cacheResult = store.books.get(args.id);

        // Do we have a cache result?
        if (typeof cacheResult !== 'undefined') {
          return { data: cacheResult };
        }

        return null;
      },
      clear: ({ cache, args }): void => {
        const store = cache();

        store.books.delete(args.id);
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
 * Render a self contained accessor with an error boundary and suspense baked in.
 */
export const renderAccessor = (component: ReactNode) => {
  const AccessorDependencies: FunctionComponent<{ children: ReactNode }> = ({
    children,
  }) => {
    const { ErrorBoundary } = useErrorBoundary();

    return (
      <ErrorBoundary
        renderError={({ error }) => (
          <span>{`${error.message} ${error.stack}`}</span>
        )}
      >
        <Suspense fallback={<span>Loading...</span>}>{children}</Suspense>
      </ErrorBoundary>
    );
  };

  return render(<AccessorDependencies>{component}</AccessorDependencies>);
};
