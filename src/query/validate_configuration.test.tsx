import { CacheResult } from './types';
import { validateConfiguration } from './validate_configuration';

test('when validating a valid query configuration', () => {
  // Given a valid query configuration.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1000,

      isPrimable: true,

      id: () => '',

      invalidate: {
        auto: { enable: false, ttl: 1000, showLoading: true },
      },

      set: () => {
        return { data: null };
      },

      get: () => {
        return null;
      },

      clear: () => {
        /* noop */
      },
    },
    suspense: {
      cache: {
        get: (_k: string) => {
          return null;
        },
        set: (_k: string, _v: () => CacheResult<null>) => {
          //
        },
      },
    },
    constraints: {
      enforce: false,
    },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a valid query configuration.
  // Then no validation errors occur.
  expect(() => validateConfiguration(configuration)).not.toThrow();
});

test(`when validating a invalid query configuration 'debug' type`, () => {
  // Given a query configuration with an invalid 'cache' type.
  const configuration = {
    debug: 42,
    cache: false,
    constraints: {
      enforce: false,
    },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'debug' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(/Invalid `debug` value\. Must be a boolean\./);
});

test(`when validating a invalid query configuration 'cache' type`, () => {
  // Given a query configuration with an invalid 'cache' type.
  const configuration = {
    debug: false,
    cache: false,
    constraints: {
      enforce: false,
    },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'cache' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(/Invalid `cache` value\. Must be an object\./);
});

test(`when validating a invalid query configuration 'cache.limit' type`, () => {
  // Given a query configuration with an invalid 'cache.limit' type.
  const configuration = {
    debug: false,
    cache: {
      limit: '0',
    },
    constraints: {
      enforce: false,
    },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'cache.limit' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `cache\.limit` value\. Must be a number\./,
  );
});

test(`when validating a invalid query configuration 'cache.ttl' type`, () => {
  // Given a query configuration with an invalid 'cache.ttl' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: '0',
    },
    constraints: {
      enforce: false,
    },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'cache.ttl' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `cache\.ttl` value\. Must be a number\./,
  );
});

test(`when validating a invalid query configuration 'cache.ttl' value`, () => {
  // Given a query configuration with an invalid 'cache.ttl' value.
  const configuration = {
    debug: false,
    cache: {
      ttl: 0,
    },
    constraints: {
      enforce: false,
    },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'cache.ttl' value.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `cache\.ttl` value\. Must be an integer greater than zero\./,
  );
});

test(`when validating a invalid query configuration 'cache.isPrimable' type`, () => {
  // Given a query configuration with an invalid 'cache.isPrimable' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: 0,
    },
    constraints: {
      enforce: false,
    },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'cache.isPrimable' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `cache\.isPrimable` value\. Must be a boolean\./,
  );
});

test(`when validating a invalid query configuration 'cache.id' type`, () => {
  // Given a query configuration with an invalid 'cache.id' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: false,
    },
    constraints: {
      enforce: false,
    },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'cache.id' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `cache\.id` value\. Must be a function\./,
  );
});

test(`when validating a invalid query configuration 'cache.get' type`, () => {
  // Given a query configuration with an invalid 'cache.get' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: () => {
        /* noop */
      },
      get: 0,
    },
    constraints: {
      enforce: false,
    },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'cache.get' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `cache\.get` value\. Must be a function\./,
  );
});

test(`when validating a invalid query configuration 'cache.set' type`, () => {
  // Given a query configuration with an invalid 'cache.set' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: () => {
        /* noop */
      },
      get: () => {
        /* noop */
      },
      set: /abc/,
    },
    constraints: {
      enforce: false,
    },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'cache.set' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `cache\.set` value\. Must be a function\./,
  );
});

test(`when validating a invalid query configuration 'cache.clear' type`, () => {
  // Given a query configuration with an invalid 'cache.clear' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: () => {
        /* noop */
      },
      get: () => {
        /* noop */
      },
      set: () => {
        /* noop */
      },
      clear: true,
    },
    constraints: {
      enforce: false,
    },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'cache.clear' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `cache\.clear` value\. Must be a function\./,
  );
});

test(`when validating a invalid query configuration 'cache.invalidate' type`, () => {
  // Given a query configuration with an invalid 'cache.invalidate' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: () => {
        /* noop */
      },
      get: () => {
        /* noop */
      },
      set: () => {
        /* noop */
      },
      clear: () => {
        /* noop */
      },
      invalidate: 3,
    },
    constraints: {
      enforce: false,
    },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'cache.invalidate' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `cache\.invalidate` value\. Must be an object\./,
  );
});

test(`when validating a invalid query configuration 'cache.invalidate.auto' type`, () => {
  // Given a query configuration with an invalid 'cache.invalidate.auto' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: () => {
        /* noop */
      },
      get: () => {
        /* noop */
      },
      set: () => {
        /* noop */
      },
      clear: () => {
        /* noop */
      },
      invalidate: {
        auto: false,
      },
    },
    constraints: {
      enforce: false,
    },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'cache.invalidate.auto' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `cache\.invalidate\.auto` value\. Must be an object\./,
  );
});

test(`when validating a invalid query configuration 'cache.invalidate.auto.enable' type.`, () => {
  // Given a query configuration with an invalid 'cache.invalidate.auto.enable' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: () => {
        /* noop */
      },
      get: () => {
        /* noop */
      },
      set: () => {
        /* noop */
      },
      clear: () => {
        /* noop */
      },
      invalidate: {
        auto: {
          enable: /abc/,
        },
      },
    },
    constraints: {
      enforce: false,
    },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'cache.invalidate.auto.enable' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `cache\.invalidate\.auto.enable` value\. Must be a boolean\./,
  );
});

test(`when validating a invalid query configuration 'cache.invalidate.auto.ttl' type.`, () => {
  // Given a query configuration with an invalid 'cache.invalidate.auto.ttl' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: () => {
        /* noop */
      },
      get: () => {
        /* noop */
      },
      set: () => {
        /* noop */
      },
      clear: () => {
        /* noop */
      },
      invalidate: {
        auto: {
          enable: true,
          ttl: false,
        },
      },
    },
    constraints: {
      enforce: false,
    },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'cache.invalidate.auto.ttl' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `cache\.invalidate\.auto.ttl` value\. Must be a number\./,
  );
});

test(`when validating a invalid query configuration 'cache.invalidate.auto.ttl' value.`, () => {
  // Given a query configuration with an invalid 'cache.invalidate.auto.ttl' value.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: () => {
        /* noop */
      },
      get: () => {
        /* noop */
      },
      set: () => {
        /* noop */
      },
      clear: () => {
        /* noop */
      },
      invalidate: {
        auto: {
          enable: true,
          ttl: 0,
        },
      },
    },
    constraints: {
      enforce: false,
    },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'cache.invalidate.auto.ttl' value.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `cache\.invalidate\.auto.ttl` value\. Must be an integer greater than zero\./,
  );
});

test(`when validating a invalid query configuration 'cache.invalidate.auto.showLoading' type.`, () => {
  // Given a query configuration with an invalid 'cache.invalidate.auto.showLoading' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: () => {
        /* noop */
      },
      get: () => {
        /* noop */
      },
      set: () => {
        /* noop */
      },
      clear: () => {
        /* noop */
      },
      invalidate: {
        auto: {
          enable: true,
          ttl: 10 * 1000,
          showLoading: {},
        },
      },
    },
    constraints: {
      enforce: false,
    },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'cache.invalidate.auto.showLoading' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `cache\.invalidate\.auto.showLoading` value\. Must be a boolean\./,
  );
});

test(`when validating a invalid query configuration 'constraints' type.`, () => {
  // Given a query configuration with an invalid 'constraints' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: () => {
        /* noop */
      },
      get: () => {
        /* noop */
      },
      set: () => {
        /* noop */
      },
      clear: () => {
        /* noop */
      },
      invalidate: {
        auto: {
          enable: true,
          ttl: 10 * 1000,
          showLoading: true,
        },
      },
    },
    constraints: false,
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'constraints' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `constraints` value\. Must be an object\./,
  );
});

test(`when validating a invalid query configuration 'constraints.enforce' type.`, () => {
  // Given a query configuration with an invalid 'constraints.enforce' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: () => {
        /* noop */
      },
      get: () => {
        /* noop */
      },
      set: () => {
        /* noop */
      },
      clear: () => {
        /* noop */
      },
      invalidate: {
        auto: {
          enable: true,
          ttl: 10 * 1000,
          showLoading: true,
        },
      },
    },
    constraints: { enforce: 3 },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'constraints.enforce' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `constraints\.enforce` value\. Must be a boolean\./,
  );
});

test(`when validating a invalid query configuration 'constraints.maxDelay' type.`, () => {
  // Given a query configuration with an invalid 'constraints.maxDelay' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: () => {
        /* noop */
      },
      get: () => {
        /* noop */
      },
      set: () => {
        /* noop */
      },
      clear: () => {
        /* noop */
      },
      invalidate: {
        auto: {
          enable: true,
          ttl: 10 * 1000,
          showLoading: true,
        },
      },
    },
    constraints: { enforce: true, maxDelay: {} },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'constraints.maxDelay' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `constraints\.maxDelay` value\. Must be a number\./,
  );
});

test(`when validating a invalid query configuration 'constraints.maxDelay' value.`, () => {
  // Given a query configuration with an invalid 'constraints.maxDelay' value.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: () => {
        /* noop */
      },
      get: () => {
        /* noop */
      },
      set: () => {
        /* noop */
      },
      clear: () => {
        /* noop */
      },
      invalidate: {
        auto: {
          enable: true,
          ttl: 10 * 1000,
          showLoading: true,
        },
      },
    },
    constraints: { enforce: true, maxDelay: 0 },
    queryRequest: async function getApiData() {
      return { status: 200, data: null };
    },
  };

  // When validating a invalid query configuration 'constraints.maxDelay' value.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `constraints\.maxDelay` value\. Must be an integer greater than zero\./,
  );
});

test(`when validating a invalid query configuration 'queryRequest' type.`, () => {
  // Given a query configuration with an invalid 'queryRequest' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: () => {
        /* noop */
      },
      get: () => {
        /* noop */
      },
      set: () => {
        /* noop */
      },
      clear: () => {
        /* noop */
      },
      invalidate: {
        auto: {
          enable: true,
          ttl: 10 * 1000,
          showLoading: true,
        },
      },
    },
    constraints: { enforce: true, maxDelay: 5 * 1000 },
    queryRequest: false,
  };

  // When validating a invalid query configuration 'queryRequest' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `queryRequest` value\. Must be a function\./,
  );
});

test(`when validating a invalid query configuration 'suspense.cache' type.`, () => {
  // Given a query configuration with an invalid 'suspense.cache' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: () => {
        /* noop */
      },
      get: () => {
        /* noop */
      },
      set: () => {
        /* noop */
      },
      clear: () => {
        /* noop */
      },
      invalidate: {
        auto: {
          enable: true,
          ttl: 10 * 1000,
          showLoading: true,
        },
      },
    },
    suspense: {},
    constraints: { enforce: true, maxDelay: 5 * 1000 },
    queryRequest: false,
  };

  // When validating an invalid configuration 'suspense.cache' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `suspense.cache` value\. Must be an object\./,
  );
});

test(`when validating a invalid query configuration 'suspense.cache.get' type.`, () => {
  // Given a query configuration with an invalid 'suspense.cache.get' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: () => {
        /* noop */
      },
      get: () => {
        /* noop */
      },
      set: () => {
        /* noop */
      },
      clear: () => {
        /* noop */
      },
      invalidate: {
        auto: {
          enable: true,
          ttl: 10 * 1000,
          showLoading: true,
        },
      },
    },
    suspense: {
      cache: {
        set: (_k: string, _v: () => string) => {
          //
        },
      },
    },
    constraints: { enforce: true, maxDelay: 5 * 1000 },
    queryRequest: false,
  };

  // When validating an invalid configuration 'suspense.cache.get' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `suspense.cache.get` value\. Must be a function\./,
  );
});

test(`when validating a invalid query configuration 'suspense.cache.set' type.`, () => {
  // Given a query configuration with an invalid 'suspense.cache.set' type.
  const configuration = {
    debug: false,
    cache: {
      ttl: 1,
      isPrimable: true,
      id: () => {
        /* noop */
      },
      get: () => {
        /* noop */
      },
      set: () => {
        /* noop */
      },
      clear: () => {
        /* noop */
      },
      invalidate: {
        auto: {
          enable: true,
          ttl: 10 * 1000,
          showLoading: true,
        },
      },
    },
    suspense: {
      cache: {
        get: (_k: string) => {
          return null;
        },
      },
    },
    constraints: { enforce: true, maxDelay: 5 * 1000 },
    queryRequest: false,
  };

  // When validating an invalid configuration 'suspense.cache.set' type.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const create = () => validateConfiguration(configuration);

  // Then a validation error is thrown.
  expect(create).toThrowError(
    /Invalid `suspense.cache.set` value\. Must be a function\./,
  );
});
