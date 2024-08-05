const { finverseWebhookHandler } = require('./handler');

describe('finverseWebhookHandler', () => {
  // pass this object to the handler to record the responses the function intends to return
  let mockResponse;

  beforeEach(() => {
    jest.restoreAllMocks();
    mockResponse = {
      send: jest.fn(),
      status: jest.fn(),
    };
    mockResponse.status.mockReturnValue(mockResponse);
  });

  test('/payments path - should return OK', async () => {
    await finverseWebhookHandler(
      {
        path: '/payments',
      },
      mockResponse
    );

    expect(mockResponse.send).toHaveBeenCalledTimes(1);
    expect(mockResponse.send).toHaveBeenCalledWith('OK');
  });

  test('/payment_links path - should return OK', async () => {
    await finverseWebhookHandler(
      {
        path: '/payment_links',
      },
      mockResponse
    );

    expect(mockResponse.send).toHaveBeenCalledTimes(1);
    expect(mockResponse.send).toHaveBeenCalledWith('OK');
  });

  test('unknown path - should return 404', async () => {
    await finverseWebhookHandler(
      {
        path: '/unhandled_path',
      },
      mockResponse
    );

    expect(mockResponse.status).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).toHaveBeenCalledWith(404);

    expect(mockResponse.send).toHaveBeenCalledTimes(1);
    expect(mockResponse.send).toHaveBeenCalledWith(
      'Path not found: /unhandled_path'
    );
  });
});
