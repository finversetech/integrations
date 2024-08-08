const functions = require('@google-cloud/functions-framework');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { FinverseSdk } = require('./sdk/finverse');
const { StoreganiseSdk } = require('./sdk/storeganise');
const { finverseWebhookHandler } = require('./handler');

// the business code is a non-sensitive field. e.g. "dev-finverse"
// it is okay to store this field as a run-time variable
const storeganiseBusinessCode = process.env.storeganise_business_code;

// the finverse client id is a non-sensitive field, okay to store as run-time variable
const finverseClientId = process.env.finverse_client_id;

const secretNames = {
  storeganiseApiKey: process.env.storeganise_api_key,
  finverseClientSecret: process.env.finverse_client_secret,
};

const secretManagerClient = new SecretManagerServiceClient();
// cache the secret values so that we don't need to fetch the values every time we get a request
const cachedValues = {
  finverseClientSecret: '',
  storeganiseApiKey: '',
  finverseCustomerToken: '',
};

// Should set the entry point in Google Cloud Functions to `storeganiseHelper` so that it uses this function
functions.http('storeganiseHelper', async (req, res) => {
  const isSignatureValid = FinverseSdk.verifySignature(
    req.rawBody.toString(),
    req.headers['fv-signature']
  );

  if (!isSignatureValid) {
    // if signature is not valid, i.e. webhook was not sent by Finverse, we should return 401
    return res.status(401).send('Unauthorized');
  }

  if (cachedValues.finverseClientSecret === '') {
    cachedValues.finverseClientSecret = await readSecret(
      secretManagerClient,
      secretNames.finverseClientSecret
    );
  }
  if (cachedValues.storeganiseApiKey === '') {
    cachedValues.storeganiseApiKey = await readSecret(
      secretManagerClient,
      secretNames.storeganiseApiKey
    );
  }

  const finverseSdk = new FinverseSdk(
    finverseClientId,
    cachedValues.finverseClientSecret
  );
  const storeganiseSdk = new StoreganiseSdk(
    storeganiseBusinessCode,
    cachedValues.storeganiseApiKey
  );

  await finverseSdk.setCachedTokenOrRefresh(cachedValues.finverseCustomerToken);
  cachedValues.finverseCustomerToken = finverseSdk.getToken();

  await finverseWebhookHandler(req, res, finverseSdk, storeganiseSdk);
});

/**
 * Fetch the latest secret value
 * @param {SecretManagerServiceClient} secretManagerClient
 * @param {string} secretName
 * @returns {string} the secret value in plaintext
 */
async function readSecret(secretManagerClient, secretName) {
  const [response] = await secretManagerClient.accessSecretVersion({
    name: secretName + '/versions/latest',
  });
  return response.payload?.data.toString();
}
