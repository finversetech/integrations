const { StoreganiseSdk } = require('./storeganise');

describe('Storeganise SDK', () => {
  const sdk = new StoreganiseSdk('businessCode', 'apiKey');

  beforeEach(() => {
    jest.restoreAllMocks();
    sdk.fetchSg = jest.fn();
  });

  test('savePaymentMethod()', async () => {
    await sdk.savePaymentMethod('finversePaymentMethodId', 'storeganiseUserId');

    expect(sdk.fetchSg).toHaveBeenCalledTimes(1);
    expect(sdk.fetchSg).toHaveBeenCalledWith('users/storeganiseUserId', {
      method: 'PUT',
      body: {
        billing: {
          id: 'finversePaymentMethodId',
          type: 'custom',
        },
      },
    });
  });

  test('writePaymentToInvoice()', async () => {
    await sdk.writePaymentToInvoice(
      'storeganiseInvoiceId',
      12345,
      '2024-08-05T11:00:00.000000Z',
      'finversePaymentId'
    );

    expect(sdk.fetchSg).toHaveBeenCalledTimes(1);
    expect(sdk.fetchSg).toHaveBeenCalledWith(
      'invoices/storeganiseInvoiceId/payments',
      {
        method: 'POST',
        body: {
          amount: 12345,
          date: '2024-08-05',
          method: 'other',
          notes: 'Finverse payment finversePaymentId',
          type: 'manual',
        },
      }
    );
  });

  test('getInvoice()', async () => {
    sdk.fetchSg.mockResolvedValue('dummy_return_value');
    const resp = await sdk.getInvoice('storeganiseInvoiceId');

    expect(resp).toBe('dummy_return_value');
    expect(sdk.fetchSg).toHaveBeenCalledTimes(1);
    expect(sdk.fetchSg).toHaveBeenCalledWith('invoices/storeganiseInvoiceId');
  });

  test('setInvoiceStatus', async () => {
    await sdk.setInvoiceStatus('storeganiseInvoiceId', 'paid');

    expect(sdk.fetchSg).toHaveBeenCalledTimes(1);
    expect(sdk.fetchSg).toHaveBeenCalledWith('invoices/storeganiseInvoiceId', {
      method: 'PUT',
      body: {
        state: 'paid',
      },
    });
  });
});
