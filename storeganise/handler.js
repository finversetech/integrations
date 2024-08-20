const Decimal = require('decimal.js');

// This function will handle the incoming HTTP request (i.e. the webhook)
async function finverseWebhookHandler(req, res, finverseSdk, storeganiseSdk) {
  const { event_type } = req.body;
  const finverseCustomerAppId = process.env.finverse_customer_app_id;

  if (!shouldHandleWebhook(event_type)) {
    // not handling this event
    return res.send('OK');
  }

  if (event_type === 'PAYMENT_EXECUTED' || event_type === 'PAYMENT_FAILED') {
    // will handle payments webhooks
    const {
      event_time,
      payment_id,
      payment_method_id,
      external_user_id,
      customer_app_id,
      metadata,
    } = req.body;

    // the customer_app_id must match the env variable
    if (customer_app_id != finverseCustomerAppId) {
      console.warn(`Unexpected customer_app_id: ${customer_app_id} != ${finverseCustomerAppId}`)
      return res.status('OK')
    }

    // Expectation: Should pass storeganise invoice id in metadata with key `storeganise_invoice_id`
    const storeganiseInvoiceId = metadata?.storeganise_invoice_id;

    if (typeof storeganiseInvoiceId !== "string") {
      console.log("Got non-string invoice id. Metadata does not contain appropriate storeganise_invoice_id")
      return res.status(400).send("missing storeganise_invoice_id in metadata")
    }

    const invoice = await storeganiseSdk.getInvoice(storeganiseInvoiceId);

    if (invoice.state === 'failed' || invoice.state === 'paid') {
      // if the invoice has already been marked into a final state, then no further action needed
      // This check is to make sure we don't double-process a webhook and record multiple payments
      // Storeganise also implements some level of idempotency to ensure identical payments don't get recorded multiple times
      return res.send('OK');
    }

    if (event_type === 'PAYMENT_EXECUTED') {
      if (typeof payment_method_id === 'string' && payment_method_id !== '') {
        // save the latest payment method used for a payment onto the storeganise user
        await storeganiseSdk.savePaymentMethod(
          payment_method_id,
          external_user_id
        );
      }

      const payment = await finverseSdk.getPayment(payment_id);
      // Finverse amount is in cents, whereas Storeganise expects amount in dollar amount
      const storeganisePaymentAmount = convertFinverseAmountToStoreganiseAmount(
        payment.amount
      );

      // Record the payment on the storeganise invoice
      await storeganiseSdk.writePaymentToInvoice(
        storeganiseInvoiceId,
        storeganisePaymentAmount,
        event_time,
        payment_id
      );
    }

    // regardless of EXECUTED or FAILED, we should update the invoice status
    const storeganiseInvoiceStatus =
      event_type === 'PAYMENT_EXECUTED' ? 'paid' : 'failed';
    await storeganiseSdk.setInvoiceStatus(
      storeganiseInvoiceId,
      storeganiseInvoiceStatus
    );
    return res.send('OK');
  }

  // will handle payment link webhooks
  if (event_type === 'PAYMENT_LINK_SETUP_SUCCEEDED') {
    const { payment_method_id, external_user_id } = req.body;
    // Expectation: The storeganise user's id is passed to finverse as the external_user_id
    await storeganiseSdk.savePaymentMethod(payment_method_id, external_user_id);
    return res.send('OK');
  }

  console.log('Got unhandled event type.', event_type);
  return res.status(500).send(`Unhandled event_type: ${event_type}`);
}

/**
 * Determine if we should handle webhook or not
 * @param {string} eventType the `event_type` property of the webhook payload
 * @returns {eventType is "PAYMENT_LINK_SETUP_SUCCEEDED" | "PAYMENT_EXECUTED" | "PAYMENT_FAILED"}
 */
function shouldHandleWebhook(eventType) {
  return [
    'PAYMENT_LINK_SETUP_SUCCEEDED',
    'PAYMENT_EXECUTED',
    'PAYMENT_FAILED',
  ].includes(eventType);
}

/**
 * Converts finverse amount (in cents) to storeganise amount (in dollars)
 * @param {number} amount - Finverse amount in cents (expect to always be an integer)
 * @returns the string version of the storeganise amount (e.g. "123.45")
 */
function convertFinverseAmountToStoreganiseAmount(amount) {
  // we cannot just do /100 here because js can have float bugs
  const finverseAmount = new Decimal(amount);
  const storeganiseAmount = finverseAmount.div(100);
  return storeganiseAmount.toString();
}

module.exports = {
  finverseWebhookHandler,
};
