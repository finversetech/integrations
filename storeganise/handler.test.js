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
      writePaymentToInvoice: jest.fn(),
      setInvoiceStatus: jest.fn(),
      getInvoice: jest.fn(),
    };

    mockFinverseSdk = {
      getPayment: jest.fn(),
    };
  });

  describe('payments webhooks', () => {
    test('PAYMENT_EXECUTED - happy path', async () => {
      mockStoreganiseSdk.getInvoice.mockResolvedValue({
        state: 'processing',
      });
      mockFinverseSdk.getPayment.mockResolvedValue({
        amount: 12345, // equivalent to $123.45
      });

      await finverseWebhookHandler(
        {
          body: {
            event_type: 'PAYMENT_EXECUTED',
            event_time: 'eventTime',
            payment_method_id: 'finversePaymentMethodId',
            payment_id: 'finversePaymentId',
            external_user_id: 'storeganiseUserId',
            metadata: {
              sg_invoice_id: 'storeganiseInvoiceId',
            },
          },
          headers: { 'fv-signature': 'signature' },
          rawBody: 'rawBody',
        },
        mockResponse,
        mockFinverseSdk,
        mockStoreganiseSdk
      );

      expect(mockStoreganiseSdk.getInvoice).toHaveBeenCalledTimes(1);
      expect(mockStoreganiseSdk.getInvoice).toHaveBeenCalledWith(
        'storeganiseInvoiceId'
      );
      expect(mockStoreganiseSdk.savePaymentMethod).toHaveBeenCalledTimes(1);
      expect(mockStoreganiseSdk.savePaymentMethod).toHaveBeenCalledWith(
        'finversePaymentMethodId',
        'storeganiseUserId'
      );
      expect(mockFinverseSdk.getPayment).toHaveBeenCalledTimes(1);
      expect(mockFinverseSdk.getPayment).toHaveBeenCalledWith(
        'finversePaymentId'
      );
      expect(mockStoreganiseSdk.writePaymentToInvoice).toHaveBeenCalledTimes(1);
      expect(mockStoreganiseSdk.writePaymentToInvoice).toHaveBeenCalledWith(
        'storeganiseInvoiceId',
        '123.45',
        'eventTime',
        'finversePaymentId'
      );
      expect(mockStoreganiseSdk.setInvoiceStatus).toHaveBeenCalledTimes(1);
      expect(mockStoreganiseSdk.setInvoiceStatus).toHaveBeenCalledWith(
        'storeganiseInvoiceId',
        'paid'
      );

      expect(mockResponse.send).toHaveBeenCalledTimes(1);
      expect(mockResponse.send).toHaveBeenCalledWith('OK');
    });

    test('PAYMENT_EXECUTED - missing sg_invoice_id in metadata', async () => {
      await finverseWebhookHandler(
        {
          body: {
            event_type: 'PAYMENT_EXECUTED',
            event_time: 'eventTime',
            payment_method_id: 'finversePaymentMethodId',
            payment_id: 'finversePaymentId',
            external_user_id: 'storeganiseUserId',
            metadata: {},
          },
          headers: { 'fv-signature': 'signature' },
          rawBody: 'rawBody',
        },
        mockResponse,
        mockFinverseSdk,
        mockStoreganiseSdk
      );

      expect(mockResponse.status).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(400);

      expect(mockResponse.send).toHaveBeenCalledTimes(1);
      expect(mockResponse.send).toHaveBeenCalledWith('missing sg_invoice_id in metadata');
    });

    test('PAYMENT_EXECUTED - invoice already paid', async () => {
      mockStoreganiseSdk.getInvoice.mockResolvedValue({
        state: 'paid',
      });

      await finverseWebhookHandler(
        {
          body: {
            event_type: 'PAYMENT_EXECUTED',
            event_time: 'eventTime',
            payment_method_id: 'finversePaymentMethodId',
            payment_id: 'finversePaymentId',
            external_user_id: 'storeganiseUserId',
            metadata: {
              sg_invoice_id: 'storeganiseInvoiceId',
            },
          },
          headers: { 'fv-signature': 'signature' },
          rawBody: 'rawBody',
        },
        mockResponse,
        mockFinverseSdk,
        mockStoreganiseSdk
      );

      expect(mockStoreganiseSdk.getInvoice).toHaveBeenCalledTimes(1);
      expect(mockStoreganiseSdk.getInvoice).toHaveBeenCalledWith(
        'storeganiseInvoiceId'
      );

      expect(mockResponse.send).toHaveBeenCalledTimes(1);
      expect(mockResponse.send).toHaveBeenCalledWith('OK');
    });

    test('PAYMENT_FAILED - happy path', async () => {
      mockStoreganiseSdk.getInvoice.mockResolvedValue({
        state: 'processing',
      });

      await finverseWebhookHandler(
        {
          body: {
            event_type: 'PAYMENT_FAILED',
            event_time: 'eventTime',
            payment_method_id: 'finversePaymentMethodId',
            payment_id: 'finversePaymentId',
            external_user_id: 'storeganiseUserId',
            metadata: {
              sg_invoice_id: 'storeganiseInvoiceId',
            },
          },
          headers: { 'fv-signature': 'signature' },
          rawBody: 'rawBody',
        },
        mockResponse,
        mockFinverseSdk,
        mockStoreganiseSdk
      );

      expect(mockStoreganiseSdk.getInvoice).toHaveBeenCalledTimes(1);
      expect(mockStoreganiseSdk.getInvoice).toHaveBeenCalledWith(
        'storeganiseInvoiceId'
      );
      expect(mockStoreganiseSdk.setInvoiceStatus).toHaveBeenCalledTimes(1);
      expect(mockStoreganiseSdk.setInvoiceStatus).toHaveBeenCalledWith(
        'storeganiseInvoiceId',
        'failed'
      );
    });
  });

  describe('payment link webhooks', () => {
    test('PAYMENT_LINK_SETUP_SUCCEEDED', async () => {
      await finverseWebhookHandler(
        {
          body: {
            event_type: 'PAYMENT_LINK_SETUP_SUCCEEDED',
            payment_method_id: 'finversePaymentMethodId',
            external_user_id: 'storeganiseUserId',
          },
          headers: { 'fv-signature': 'signature' },
          rawBody: 'rawBody',
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
  });

  test('unhandled event - should return 200', async () => {
    await finverseWebhookHandler(
      {
        headers: { 'fv-signature': 'signature' },
        body: {
          event_type: 'PAYMENT_SUBMITTED',
        },
        rawBody: 'rawBody',
      },
      mockResponse,
      mockFinverseSdk,
      mockStoreganiseSdk
    );

    expect(mockResponse.send).toHaveBeenCalledTimes(1);
    expect(mockResponse.send).toHaveBeenCalledWith('OK');
  });
});
