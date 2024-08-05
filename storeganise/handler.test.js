const { finverseWebhookHandler } = require('./handler');

describe('finverseWebhookHandler', () => {
  // pass this object to the handler to record the responses the function intends to return
  let mockResponse;
  let mockFinverseSdk;
  let mockStoreganiseSdk;

  beforeEach(() => {
    jest.restoreAllMocks();
    mockResponse = {
      send: jest.fn(),
      status: jest.fn(),
    };
    mockResponse.status.mockReturnValue(mockResponse);

    mockStoreganiseSdk = {
      savePaymentMethod: jest.fn(),
    };
  });

  test('/payments path - should return OK', async () => {
    await finverseWebhookHandler(
      {
        path: '/payments',
      },
      mockResponse,
      mockFinverseSdk,
      mockStoreganiseSdk
    );

    expect(mockResponse.send).toHaveBeenCalledTimes(1);
    expect(mockResponse.send).toHaveBeenCalledWith('OK');
  });

  describe('/payment_links', () => {
    test('PAYMENT_LINK_SETUP_SUCCEEDED', async () => {
      await finverseWebhookHandler(
        {
          path: '/payment_links',
          body: {
            event_type: 'PAYMENT_LINK_SETUP_SUCCEEDED',
            payment_method_id: 'finversePaymentMethodId',
            external_user_id: 'storeganiseUserId',
          },
        },
        mockResponse,
        mockFinverseSdk,
        mockStoreganiseSdk
      );

      expect(mockStoreganiseSdk.savePaymentMethod).toHaveBeenCalledTimes(1);
      expect(mockStoreganiseSdk.savePaymentMethod).toHaveBeenCalledWith(
        'finversePaymentMethodId',
        'storeganiseUserId'
      );
      expect(mockResponse.send).toHaveBeenCalledTimes(1);
      expect(mockResponse.send).toHaveBeenCalledWith('OK');
    });

    test('Other event', async () => {
      await finverseWebhookHandler(
        {
          path: '/payment_links',
          body: {
            event_type: 'PAYMENT_LINK_PAID',
          },
        },
        mockResponse,
        mockFinverseSdk,
        mockStoreganiseSdk
      );

      expect(mockStoreganiseSdk.savePaymentMethod).toHaveBeenCalledTimes(0);
      expect(mockResponse.send).toHaveBeenCalledTimes(1);
      expect(mockResponse.send).toHaveBeenCalledWith('OK');
    });
  });

  test('unknown path - should return 404', async () => {
    await finverseWebhookHandler(
      {
        path: '/unhandled_path',
      },
      mockResponse,
      mockFinverseSdk,
      mockStoreganiseSdk
    );

    expect(mockResponse.status).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).toHaveBeenCalledWith(404);

    expect(mockResponse.send).toHaveBeenCalledTimes(1);
    expect(mockResponse.send).toHaveBeenCalledWith(
      'Path not found: /unhandled_path'
    );
  });
});
