import { createCacheStore, createConfiguration } from '../../test/query';
import { createComponent } from './create_component';

// Assert that we can create an accessor query hook.
jest.mock('./create_hook', () => ({
  createHook: jest.fn(),
}));

test('when creating an accessor query component, then an accessor query hook is created', async () => {
  // Given a data cache store.
  const cacheStore = createCacheStore();
  // And a accessor query configuration.
  const configuration = createConfiguration(cacheStore, {});

  // When creating an accessor query component.
  createComponent(configuration);

  // Then an accessor query hook is created.
  const { createHook } = jest.requireMock('./create_hook');
  expect(createHook).toHaveBeenCalledWith(configuration);
  expect(createHook).toHaveBeenCalledTimes(1);
});
