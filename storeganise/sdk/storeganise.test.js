const StoreganiseSdk = require('./storeganise').default;

describe('Storeganise SDK', () => {
  const sdk = new StoreganiseSdk('businessCode', 'apiKey');
  const fetchMock = jest.spyOn(sdk, 'fetchSg');

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('savePaymentMethod()', async () => {
    await sdk.savePaymentMethod('finversePaymentMethodId', 'storeganiseUserId');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
