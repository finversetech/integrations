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
        custom: {
          finverse_payment_method_id: 'finversePaymentMethodId',
        },
      },
    });
  });

  test('writePaymentToInvoice()', async () => {
    await sdk.writePaymentToInvoice(
      'storeganiseInvoiceId',
      '123.45',
      '2024-08-05T11:00:00.000000Z',
      'finversePaymentId'
    );

    const expectedJsonBody = {
      amount: 123.45,
      date: '2024-08-05',
      method: 'other',
      notes: 'Finverse payment finversePaymentId',
      type: 'manual',
    };

    expect(sdk.fetchSg).toHaveBeenCalledTimes(1);
    expect(sdk.fetchSg).toHaveBeenCalledWith(
      'invoices/storeganiseInvoiceId/payments',
      {
        method: 'POST',
        body: JSON.stringify(expectedJsonBody),
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
