# `data-accessor`

[![npm](http://img.shields.io/npm/v/data-accessor.svg?style=flat-square)](https://www.npmjs.org/package/data-accessor)
[![license](https://img.shields.io/npm/l/data-accessor?style=flat-square)](https://github.com/Nate-Wilkins/data-accessor/blob/main/LICENSE)
[![status](https://img.shields.io/travis/Nate-Wilkins/data-accessor.svg?style=flat-square)](https://travis-ci.org/Nate-Wilkins/data-accessor)
[![test coverage](https://img.shields.io/badge/test%20coverage-62%25-green?style=flat-square)](https://travis-ci.com/Nate-Wilkins/data-accessor)
[![dependencies](https://badges.depfu.com/badges/d8b66f8525f8724877c53766ef13853e/count.svg)](https://badges.depfu.com/github/Nate-Wilkins/data-accessor?project_id=37340)

> Simplified delayed data access, loading, error, and display states.

```
yarn add data-accessor
```

The purpose of this library is to simplify delayed data access patterns.

Why? Because delaying data retrieval until you need it usually *just* works and can simplify development in some
cases. Especially prototyping and self contained libraries. In other areas, such as performance, delayed data access
can cause duplication with data retrieval and it's important to figure out when you need to retrieve certain data.

This library provides a:

1. Query pattern for components that require data retrieval                  (Network Requests, Pagination, etc)
2. Caching pattern for data models.                                          (Time To Live, Priming, Auto Invalidation, etc)
3. Display states for query pattern.                                         (`Boundary`, also known as `Suspense` and `ErrorBoundary`)
4. Constraints to help improve performance and reusability.                  (Service Level Agreement, Monitoring, etc)

These patterns should allow developers to work more confidently with their data models and *may* improve the performance
for certain data paths with cache priming but optimizing your data and database queries to meet the requirements of your
application will be a more productive strategy.

This library is primarily here to help keep the client stable, predictable, and readable.

## Usage

```typescript
import { Boundary, Query } form 'data-accessor';

const QueryGetUser = Query.createComponent({
  debug: true,
  cache: { duration, id, set, get, clear };
  query
});

export const UserProfile: FunctionComponent<{ email: string }> = ({ email }) => {
  return (
    <Boundary onLoading={null} onError={null}>
      <V1QueryUser args={{ email }}>
        {({ data }) => (
          <code>
            {JSON.strinigify(data)}
          </code>
        )}
      </V1QueryUser>
    </Boundary>
  );
};

const V1QueryUser: FunctionComponent = <T,>({ args }) => {
  const result = useQuery({
    debug: true,
    cache: {
      ttl: 1000 * 60 * 5,
      get,
      set,
      clear,
      isPrimable: true,
    },
    query: api.getUser
  }, args);


  return <>{children(result)}</>;
};

```































### Queries

Queries are "read" functions against your data and are known as __Accessor Queries__.
These queries are created with a cache configuration and `query` promise used to retrieve data when it's not available
in the cache.

Let's say we're creating an accessor query for getting a collection of `Book`s with the following data types:

```typescript
type Book = {
  id: string;
  title: string;
  category: string;
  authorId: string;
};

type PaginationInfo = {
  totalCount: number;
  nextCursor?: string;
};

type RequestGetBooks = {
  pageSize: number,
  category?: string;
  cursor?: string;
};

type ResponseGetBooks = {
  books: Book[],
  paginationInfo: PaginationInfo,
};

interface CacheStore extends AccessorQuery.AccessorQueryCacheStore = {
  books: Map<string, Book>,
  paginationInfo: Map<string, PaginationInfo>
};
```

And a HTTP API client `http_api` that looks like the following:

```typescript
export const getBooks = async ({
  pageSize,
  category,
  cursor,
}: RequestGetBooks): Promise<{
  status: number;
  data?: null | ResponseGetBooks;
  error?: string;
}> => {
  const response = await fetch(
    `${Config.API_URL}/v1/getBooks?${qs.stringify({
      pageSize,
      category,
      cursor,
    })}`,
    {
      headers: {
        Authorize: getAuthorization(),
      },
    },
  );

  // Success response.
  if (response.status === 200) {
    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      // All 200 response status codes should be json serializable.
      // No exceptions.
      logger.error('Unable to parse JSON for response.');
      throw e;
    }

    return {
      status: response.status,
      data,
    };
  }

  // Error response.
  return {
    status: response.status,
    error: response.statusText,
  };
};
```

1. Step one is to create an accessor query configuration.

```typescript
import { AccessorQuery, AccessorQueryConfiguration } from 'data-accessor';
import * as api from 'http_api';

const configuration: AccessorQueryConfiguration<
  CacheStore,
  RequestGetBooks,
  ResponseGetBooks,
  Book[]
> = {
  cache: {
    duration: 1000 * 60 * 10, // 10mins
    isPrimableFromCache: true,
    id: ({ args }) => {
      return `getBooks#${args.pageSize}#category#${args.category}#cursor#${args.cursor}`;
    },
    set: ({ cache, cacheId, response, request }) => {
      const store = cache();

      // Parse.
      const books = response.data.books;

      // Set cache.
      for (let book of books) { store.books.set(book.id, book); }
      store.paginationInfo.set(cacheId, paginationInfo);

      return {
        data: store.books.values(),
        fetchMore:
          paginationInfo && paginationInfo.nextCursor
            ? () =>
                request({
                  pageSize: args.pageSize,
                  category: args.category,
                  cursor: paginationInfo.nextCursor,
                })
            : null,
      };
    },
    get: ({ cache, args }) => {
      const store = cache();

      // Get cache.
      const cacheResultPaginationInfo = store.paginationInfo.get(cacheId);
      if (cacheResultPaginationInfo) {
        const cacheResultData = [];
        for (let book of store.books.values()) {
          // Filter for this query.
          // NOTE: Accessor caches don't care about request args like `pageSize` and `cursor`.
          //       But it's guaranteed that a request was made if we get here.
          if (book.category !== args.category) { continue; }
          cacheResultData.push(book);
        }

        // Do we have cache results?
        if (cacheResultData.length > 0) {
          return {
            data: cacheResultData,
            fetchMore:
              cacheResultPaginationInfo && cacheResultPaginationInfo.nextCursor
                ? () =>
                    request({
                      pageSize: args.pageSize,
                      category: args.category,
                      cursor: cacheResultPaginationInfo.nextCursor,
                    })
                : null,
          };
        }
      }

      return null;
    },
  },
  query: api.getBooks,
};
```

2. Then make sure your data cache is setup.
   This example uses [`zustand`](https://github.com/pmndrs/zustand).

```
TODO: zustand example.
```

3. And finally to create the accessor query with the configuration.

#### ReactJS

4. In ReactJS you can do this in two different ways. But the configuration is the same.

```typescript
// 1. Accessor as a component. (recommended)
//    Useful for declarative data access.
export const AccessorGetBooks = accessorQuery.createComponent<
  State,
  RequestGetBooks,
  ResponseGetBooks,
  Category[]
>(configuration);

// 2. Accessor as a hook.
//    Useful if you are already used to data access as hooks.
export const useGetBooks = accessorQuery.createHook<
  State,
  RequestGetBooks,
  ResponseGetBooks,
  Category[]
>(configuration);
```

5. The last step is to use your accessor query.
   Notice how we are utilizing `ErrorBoundary` and `Suspense` here for error handling and loading states respectively.
   No additional setup is needed to get these components to work.

```typescript
// 1. Accessor as a component.
export const PageBooks: FunctionComponent<{ category: string }> = ({ category }) => {
  const { ErrorBoundary, error } = useErrorBoundary();

  if (error) {
    return (
      <div>
        <span>Sorry an error occurred!</span>
        <span>{error.message}</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <AccessorGetBooks
          cache={useStore.getState}
          args={{ pageSize: 50, category }}
        >
          {({ data: { books }, fetchMore }) => (
            <>
              {books.map((book) => (
                <div>
                  <h3>{book.title}</h3>
                  <h4>{book.category}</h4>
                </div>
              ))}

              {/* Load more. */}
              <Waypoint onEnter={() => { fetchMore && fetchMore(); }} />
            </>
          )}
        </AccessorGetBooks>
      </Suspense>
    </ErrorBoundary>
  );
};

// 2. Accessor as a hook.
//    Works similarly to the component form but requires that the hook be used *inside* the `Suspense` and `ErrorBoundary` components.
//    Which will require another component.
export const PageBooks: FunctionComponent<{ category: string }> = ({ category }) => {
  const { ErrorBoundary, error } = useErrorBoundary();

  if (error) {
    return (
      <div>
        <span>Sorry an error occurred!</span>
        <span>{error.message}</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <PageBookList category={category} />
      </Suspense>
    </ErrorBoundary>
  );
};

const PageBookList: FunctionComponent<{ category: string }> = ({ category }) => {
  const { data: { books }, fetchMore } = useBooks({
    cache: useStore.getState,
    args: { pageSize: 50, category }
  });

  return (
    <>
      {books.map((book) => (
        <div>
          <h3>{book.title}</h3>
          <h4>{book.category}</h4>
        </div>
      ))}

      {/* Load more. */}
      <Waypoint onEnter={() => { fetchMore && fetchMore(); }} />
    </>
  );
};
```

#### Usage with Data Caching

When using an accessor query you have the ability to request the cached request in sub components.
This allows the developer to explicitly bind a specific UI component to a data model.

Example:

```typescript
export const DashboardGraphRevenue = ({ startDate, endDate }: { startDate: Date, endDate?: Date }) => {
  return (
    <AccessorGetRevenue
      cache={useStore.getState}
      args={{ startDate, endDate }}
    >
      {({ data: { revenue } }) => (
        <DashboardGraphRevenueCanvas startDate={startDate} endDate={endDate} revenue={revenue} />
      )}
    </AccessorGetRevenue>
  );
};
```

Now this isn't any different from using an accessor query to query for the required data. However,
if you put the same `AccessorGetRevenue` higher in the component tree the accessor will reuse the same
configuration and cache.

You can also explicitly require your components to load from cache and throw an error when the data they
require isn't available in cache by adding the `cacheOnly` property.

Example:

```typescript
export const DashboardGraphRevenue = ({ startDate, endDate }: { startDate: Date, endDate?: Date }) => {
  return (
    <AccessorGetRevenue
      cache={useStore.getState}
      cacheOnly
      args={{ startDate, endDate }}
    >
      {({ data: { revenue } }) => (
        <DashboardGraphRevenueCanvas startDate={startDate} endDate={endDate} revenue={revenue} />
      )}
    </AccessorGetRevenue>
  );
};
```

#### Usage with Data Cache Priming

The idea here is that a data cache is kept so that requests to an external data source don't need to happen.

Let's say for example we extend our usage example above and we want to render a page with book details.

We can make a request to our HTTP API with our client with something like this:

```typescript
export const getBook = async ({
  id: string
}: RequestGetBook): Promise<{
  status: number;
  data?: null | ResponseGetBook;
  error?: string;
}> => {
  const response = await fetch(
    `${Config.API_URL}/v1/getBook?${qs.stringify({
      id
    })}`,
    {
      headers: {
        Authorize: getAuthorization(),
      },
    },
  );

  // ...return response...
};
```

Or we could take this a step further and read our data cache with an accessor.

```typescript
import { AccessorQuery, AccessorQueryConfiguration } from 'data-accessor';
import * as api from 'http_api';

const configuration: AccessorQueryConfiguration<
  CacheStore,
  RequestGetBook,
  ResponseGetBook,
  Book
> = {
  cache: {
    duration: 1000 * 60 * 10, // 10mins
    isPrimableFromCache: true,
    id: ({ args }) => {
      return `getBook#${args.id}`;
    },
    set: ({ cache, cacheId, response, request }) => {
      const store = cache();

      // Parse.
      const book = response.data.book;

      // Set cache.
      store.books.set(book.id, book);

      return { data: book };
    },
    get: ({ cache, args }) => {
      const store = cache();

      // Get cache.
      const cacheResultData = store.books.get(args.id);
      if (typeof cacheResultData !== undefined) {
        return { data: cacheResultData };
      }

      return null;
    },
  }
  query: api.getBook,
};
```

Now when we use our new accessor in `PageBookDetails` it can use the `books` set from other requests.
This looks something like:

```typescript
export const PageBookDetails: FunctionComponent<{ id: string }> = ({ id }) => {
  const { ErrorBoundary, error } = useErrorBoundary();

  if (error) {
    return (
      <div>
        <span>Sorry an error occurred!</span>
        <span>{error.message}</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <AccessorGetBook
          cache={useStore.getState}
          args={{ id }}
        >
          {({ data: { book } }) => (
            <div>
              <h3>{book.title}</h3>
              <h4>{book.category}</h4>
            </div>
          )}
        </AccessorGetBook>
      </Suspense>
    </ErrorBoundary>
  );
};
```

This is called data cache priming and is on by default as `cacheIsPrimableFromCache`.
It's important to mention this priming mechanism only works when you can satisfy the accessor `cacheGet` function.
So if you can't a new request might be made.

#### Usage with Multiple Accessor Queries

While accessors are nice to have being able to compose accessors can be pretty powerful and allow for some interesting
development.

Here's an example where our `PageBookDetails` requires the author data type for our book:

```typescript
export const PageBookDetails: FunctionComponent<{ id: string }> = ({ id }) => {
  const { ErrorBoundary, error } = useErrorBoundary();

  if (error) {
    return (
      <div>
        <span>Sorry an error occurred!</span>
        <span>{error.message}</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <AccessorGetBook
          cache={useStore.getState}
          args={{ id }}
        >
          {({ data: { book } }) => (
            <AccessorGetAuthor
              cache={useStore.getState}
              args={{ id: book.authorId }}
            >
              {({ data: { author } }) => (
                <div>
                  <h3>{book.title}</h3>
                  <h4>{book.category}</h4>
                  <h4>{author.name}</h4>
                </div>
              )}
            </AccessorGetAuthor>
          )}
        </AccessorGetBook>
      </Suspense>
    </ErrorBoundary>
  );
};
```

When accessors are composed, whether as components or hooks, accessor `query` calls will be made in parallel if they can
be. When they can't, as in the case above where `AccessorGetAuthor` requires the `book.authorId` the `query` calls will
be made sequentially.

There are a few different ways you can combine accessor queries and you can check them out in this [Stackblitz Demo on
Accessor Query Composition Benchmarking](https://stackblitz.com/edit/react-data-accessor-perf-benchmarking?embed=1&file=src/index.tsx&theme=dark&view=both).

In short there's no one *best* way to compose accessors and its left up to the client.

#### Usage with Constraints

The accessors also have the ability to add constraints. These constraints are designed to help keep the accessor stable and in line with expectations.

Here is an example where the `maxDelay` constraint is added and `enforce` is also set to throw `ErrorTimedOut` errors
when the duration of the accessor call is over `maxDelay`. Feel free to turn this off/on for production/development.

```typescript
import { AccessorQuery, AccessorQueryConfiguration } from 'data-accessor';
import * as api from 'http_api';

const configuration: AccessorQueryConfiguration<
  CacheStore,
  RequestGetBooks,
  ResponseGetBooks,
  Book[]
> = {
  debug: true,
  constraints: {
    enforce: true,
    maxDelay: 1000 * 10, // 10secs
  },
  // ... cache configuration ...
  query: api.getBooks,
};
```

#### Organization in the File System

To keep things organized it's recommended that you keep accessors in the same place. For example here is the file system
for the examples shown above:

```
 .
├──  index.ts
├──  Application.ts
├──  api
├─────  index.ts
├──  pages
├─────  index.ts
├─────  PageBooks.ts
├─────  PageBookDetails.ts
└──  accessors
   ├──  index.ts
   ├──  AccessorGetAuthor.ts
   ├──  AccessorGetBook.ts
   └──  AccessorGetBooks.ts
```

## TODO:

- Make an accessor query callback stack analyzer.
