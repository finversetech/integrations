// This function will handle the incoming HTTP request (i.e. the webhook)
async function finverseWebhookHandler(req, res) {
  // TODO: Add handling logic, for now just return 200
  return res.send('OK');
}

module.exports = {
  finverseWebhookHandler,
};
