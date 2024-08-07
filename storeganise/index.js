const functions = require('@google-cloud/functions-framework');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { FinverseSdk } = require('./sdk/finverse');
const { StoreganiseSdk } = require('./sdk/storeganise');
const { finverseWebhookHandler } = require('./handler');

// the business code is a non-sensitive field. e.g. "dev-finverse"
// it is okay to store this field as a run-time variable
const storeganiseBusinessCode = process.env.storeganise_business_code;

const secretNames = {
  storeganiseApiKey: process.env.storeganise_api_key,
  finverseClientId: process.env.finverse_client_id,
  finverseClientSecret: process.env.finverse_client_secret,
};

const secretManagerClient = new SecretManagerServiceClient();
// cache the secret values so that we don't need to fetch the values every time we get a request
const cachedSecretValues = {
  finverseClientId: '',
  finverseClientSecret: '',
  storeganiseApiKey: '',
};

// Should set the entry point in Google Cloud Functions to `storeganiseHelper` so that it uses this function
functions.http('storeganiseHelper', async (req, res) => {
  if (cachedSecretValues.finverseClientId === '') {
    cachedSecretValues.finverseClientId = await readSecret(
      secretManagerClient,
      secretNames.finverseClientId
    );
  }
  if (cachedSecretValues.finverseClientSecret === '') {
    cachedSecretValues.finverseClientSecret = await readSecret(
      secretManagerClient,
      secretNames.finverseClientSecret
    );
  }
  if (cachedSecretValues.storeganiseApiKey === '') {
    cachedSecretValues.storeganiseApiKey = await readSecret(
      secretManagerClient,
      secretNames.storeganiseApiKey
    );
  }

  const finverseSdk = new FinverseSdk(
    cachedSecretValues.finverseClientId,
    cachedSecretValues.finverseClientSecret
  );
  const storeganiseSdk = new StoreganiseSdk(
    storeganiseBusinessCode,
    cachedSecretValues.storeganiseApiKey
  );

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
