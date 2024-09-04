const crypto = require('crypto');
const functions = require('@google-cloud/functions-framework');
const { finverseWebhookHandler } = require('./handler');

// the business code is a non-sensitive field. e.g. "dev-finverse"
// it is okay to store this field as a run-time variable
const storeganiseBusinessCode = process.env.storeganise_business_code;

// the finverse client id & customer app id is a non-sensitive field, okay to store as run-time variable
const finverseClientId = process.env.finverse_client_id;
const finverseCustomerAppId = process.env.finverse_customer_app_id;

// the storeganise api key and finverse client secret are sensitive fields and should be treated as such;
// ideally these should be fetched from some secret management solution (e.g. Google Secret Manager)
const secretNames = {
  storeganiseApiKey: process.env.storeganise_api_key,
  finverseClientSecret: process.env.finverse_client_secret,
};

const secretManagerClient = new SecretManagerServiceClient();

// Should set the entry point in Google Cloud Functions to `storeganiseHelper` so that it uses this function
functions.http('storeganiseHelper', async (req, res) => {
  if (req.body.customer_app_id !== finverseCustomerAppId) {
    // Should not handle webhooks that are not associated with your finverse customer app.
    // This protects against malicious actors making a replay attack with valid Finverse
    // webhooks where the intended recpient is not you
    return res.send(401).send();
  }

  // Validate that the incoming webhook is from Finverse
  const gotSignature = req.headers['fv-signature'];
  if (typeof gotSignature !== 'string' || gotSignature === '') {
    // empty signature; invalid webhook. Finverse will always provide a webhook signature in the header
    return res.status(401).send();
  }
  const isSignatureValid = verifyFinverseSignature(
    req.rawBody?.toString() ?? '',
    gotSignature
  );
  if (!isSignatureValid) {
    return res.status(401).send('Unauthorized');
  }

  // Now that we know this is a valid webhook intended for this handler, we should fetch the secrets 
  const finverseClientSecret = await readSecret(
    secretNames.finverseClientSecret
  );
  const storeganiseApiKey = await readSecret(secretNames.storeganiseApiKey);

  const finverseSdk = new FinverseSdk(finverseClientId, finverseClientSecret);
  const storeganiseSdk = new StoreganiseSdk(
    storeganiseBusinessCode,
    storeganiseApiKey
  );

  await finverseSdk.setCachedTokenOrRefresh(cachedValues.finverseCustomerToken);
  cachedValues.finverseCustomerToken = finverseSdk.getToken();

  await finverseWebhookHandler(req, res, finverseSdk, storeganiseSdk);
});

/**
 * Fetch the latest secret value
 * @param {string} secretName
 * @returns {string} the secret value in plaintext
 */
async function readSecret(secretName) {
  const [response] = await secretManagerClient.accessSecretVersion({
    name: secretName + '/versions/latest',
  });
  return response.payload?.data.toString();
}

// used to verify webhook signatures. Can be retrieved from https://docs.finverse.com/#bf53157c-8de2-418f-be88-38f81332be4b
const finversePublicKey = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEuZId/6U0gKLodSihwC/EuMGtULx8
G3r7X7nZ3KWO5uNVtRTC64MH/1faq9zRp/2iIjCT8erSxiyO6y8wnlqMqw==
-----END PUBLIC KEY-----`;

/**
 * Verify that finverse signature is legitimiate
 * @param {string} rawPayload the incoming raw webhook payload
 * @param {string} signature the finverse signature
 * @returns {bool} decision on whether the finverse signature is legitimate or not
 */
async function verifyFinverseSignature(rawPayload, signature) {
  // finverse signature is base64 encoded
  const decodedSignature = Buffer.from(signature, 'base64');

  const textEncoder = new TextEncoder();
  const payloadInBytes = textEncoder.encode(rawPayload);

  const publicKey = crypto.createPublicKey(finversePublicKey);
  const verify = crypto.createVerify('SHA256');
  verify.update(payloadInBytes).end();
  return verify.verify(publicKey, decodedSignature);
}
