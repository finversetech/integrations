const { getFunction } = require('@google-cloud/functions-framework/testing');
const { FinverseSdk } = require('./sdk/finverse');
const { StoreganiseSdk } = require('./sdk/storeganise');

const mockSecretClient = {
  accessSecretVersion: jest.fn(),
};
const mockFinverseWebhookHandler = jest.fn();

jest.mock('@google-cloud/secret-manager', () => {
  return {
    SecretManagerServiceClient: jest.fn().mockReturnValue(mockSecretClient),
  };
});

jest.mock('./sdk/finverse');
jest.mock('./sdk/storeganise');
jest.mock('./handler', () => {
  return {
    finverseWebhookHandler: mockFinverseWebhookHandler,
  };
});

// Need to mock env before we load the index file, otherwise it will read the un-mocked env
process.env = {
  ...process.env,
  storeganise_business_code: 'businesscode',
  finverse_client_id: 'finverseClientId',
};

// load the index file now
require('./index');

describe('Storeganise Helper', () => {
  test('invalid signature', async () => {
    FinverseSdk.verifySignature = jest.fn().mockReturnValueOnce(false);
    const storeganiseHelper = getFunction('storeganiseHelper');
    const req = {
      body: { key: 'value' },
      rawBody: 'rawBody',
      headers: {
        'fv-signature': 'SignatureBASE64',
      },
    };
    const res = {
      send: jest.fn(),
    };
    res.status = jest.fn().mockReturnValue(res);

    await storeganiseHelper(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith('Unauthorized');
    expect(FinverseSdk.verifySignature).toHaveBeenCalledTimes(1);
    expect(FinverseSdk.verifySignature).toHaveBeenCalledWith(
      'rawBody',
      'SignatureBASE64'
    );

    // no sdk should have been initialised, no secrets should have been read
    expect(mockSecretClient.accessSecretVersion).toHaveBeenCalledTimes(0);
    expect(FinverseSdk).toHaveBeenCalledTimes(0);
    expect(StoreganiseSdk).toHaveBeenCalledTimes(0);
    expect(mockFinverseWebhookHandler).toHaveBeenCalledTimes(0);
  });

  test('valid signature', async () => {
    FinverseSdk.verifySignature = jest.fn().mockReturnValueOnce(true);
    const mockFinverseSdk = {
      setCachedTokenOrRefresh: jest.fn(),
      getToken: jest.fn(),
    };
    const mockStoreganiseSdk = {};
    // mock the sdk constructors
    FinverseSdk.mockImplementation(() => mockFinverseSdk);
    StoreganiseSdk.mockImplementation(() => mockStoreganiseSdk);
    mockSecretClient.accessSecretVersion
      .mockReturnValueOnce([{ payload: { data: 'finverseClientSecret' } }])
      .mockReturnValueOnce([{ payload: { data: 'storeganiseApiKey' } }]);

    const storeganiseHelper = getFunction('storeganiseHelper');
    const req = {
      body: { key: 'value' },
      rawBody: 'rawBody',
      headers: {
        'fv-signature': 'SignatureBASE64',
      },
    };
    const res = {
      send: jest.fn(),
    };
    res.status = jest.fn().mockReturnValue(res);

    await storeganiseHelper(req, res);

    expect(FinverseSdk.verifySignature).toHaveBeenCalledTimes(1);
    expect(FinverseSdk.verifySignature).toHaveBeenCalledWith(
      'rawBody',
      'SignatureBASE64'
    );
    expect(mockSecretClient.accessSecretVersion).toHaveBeenCalledTimes(2);

    expect(FinverseSdk).toHaveBeenCalledTimes(1);
    expect(FinverseSdk).toHaveBeenCalledWith(
      'finverseClientId',
      'finverseClientSecret'
    );
    expect(StoreganiseSdk).toHaveBeenCalledTimes(1);
    expect(StoreganiseSdk).toHaveBeenCalledWith(
      'businesscode',
      'storeganiseApiKey'
    );
    expect(mockFinverseWebhookHandler).toHaveBeenCalledTimes(1);
    expect(mockFinverseWebhookHandler).toHaveBeenCalledWith(
      req,
      res,
      mockFinverseSdk,
      mockStoreganiseSdk
    );
  });
});
