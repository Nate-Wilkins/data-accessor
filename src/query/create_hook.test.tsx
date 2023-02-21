import { createQueryConfiguration } from '../../test/accessor';
import { createComponent } from './create_component';

// Assert that we can create an accessor query.
jest.mock('./create_accessor', () => ({
  createAccessor: jest.fn(() => ({})),
}));

test('when creating an accessor query hook, then an accessor query is created', async () => {
  // Given a accessor query configuration.
  const configuration = createQueryConfiguration({});

  // When creating an accessor query hook.
  createComponent(configuration);

  // Then an accessor query is created.
  const { createAccessor } = jest.requireMock('./create_accessor');
  expect(createAccessor).toHaveBeenCalledWith(configuration);
  expect(createAccessor).toHaveBeenCalledTimes(1);
});
