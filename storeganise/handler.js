const { FinverseSdk } = require('./sdk/finverse');
const { StoreganiseSdk } = require('./sdk/storeganise');

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

// This function will handle the incoming HTTP request (i.e. the webhook)
async function finverseWebhookHandler(req, res) {
  const _finverseSdk = new FinverseSdk(finverseClientId, finverseClientSecret);
  const _storeganiseSdk = new StoreganiseSdk(
    storeganiseBusinessCode,
    storeganiseApiKey
  );

  // TODO: Should verify signature of webhook and ensure it is from Finverse

  // will handle payments webhooks
  if (req.path === '/payments') {
    // TODO: Handle payment webhooks
    return res.send('OK');
  }

  // will handle payment link webhooks
  if (req.path === '/payment_links') {
    // TODO: Handle payment link webhooks
    return res.send('OK');
  }

  return res.status(404).send(`Path not found: ${req.path}`);
}

module.exports = {
  finverseWebhookHandler,
};
