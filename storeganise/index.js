const functions = require('@google-cloud/functions-framework');
const { finverseWebhookHandler } = require('./handler');

// Should set the entry point in Google Cloud Functions to `storeganiseHelper` so that it uses this function
functions.http('storeganiseHelper', finverseWebhookHandler);
