const functions = require('@google-cloud/functions-framework');
const { FinverseSdk } = require('./sdk/finverse');
const { StoreganiseSdk } = require('./sdk/storeganise');
const { finverseWebhookHandler } = require('./handler');

// the business code is a non-sensitive field. e.g. "dev-finverse"
// it is okay to store this field as a run-time variable
const storeganiseBusinessCode = process.env.storeganise_business_code;

// the storeganise API key is a sensitive field that should be stored in the appropriate location for secrets
// currently storing it as a runtime variable as part of v1. Should move to secret manager as part of official production-ization
const storeganiseApiKey = process.env.storeganise_api_key;

// Finverse client id and secrets are sensitive fields and should be stored in the appropriate location for secrets
// currently storing as runtime variables as part of v1. Should move to secret manager as part of official production-ization
const finverseClientId = process.env.finverse_client_id;
const finverseClientSecret = process.env.finverse_client_secret;

// Should set the entry point in Google Cloud Functions to `storeganiseHelper` so that it uses this function
functions.http('storeganiseHelper', async (req, res) => {
  const finverseSdk = new FinverseSdk(finverseClientId, finverseClientSecret);
  const storeganiseSdk = new StoreganiseSdk(
    storeganiseBusinessCode,
    storeganiseApiKey
  );

  await finverseWebhookHandler(req, res, finverseSdk, storeganiseSdk);
});
