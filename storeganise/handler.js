// This function will handle the incoming HTTP request (i.e. the webhook)
async function finverseWebhookHandler(req, res, finverseSdk, storeganiseSdk) {
  // TODO: Should verify signature of webhook and ensure it is from Finverse

  // will handle payments webhooks
  if (req.path === '/payments') {
    // TODO: Handle payment webhooks
    return res.send('OK');
  }

  // will handle payment link webhooks
  if (req.path === '/payment_links') {
    const { event_type } = req.body;
    if (event_type !== 'PAYMENT_LINK_SETUP_SUCCEEDED') {
      // we will not handle events other than PAYMENT_LINK_SETUP_SUCCEEDED
      return res.send('OK');
    }
    const { payment_method_id, external_user_id } = req.body;
    // Expectation: The storeganise user's id is passed to finverse as the external_user_id
    await storeganiseSdk.savePaymentMethod(payment_method_id, external_user_id);
    return res.send('OK');
  }

  return res.status(404).send(`Path not found: ${req.path}`);
}

module.exports = {
  finverseWebhookHandler,
};
