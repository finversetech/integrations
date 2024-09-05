const Decimal = require('decimal.js');

// This function will handle the incoming HTTP request (i.e. the webhook)
async function finverseWebhookHandler(req, res, finverseSdk, storeganiseSdk) {
  const { event_type } = req.body;

  if (!shouldHandleWebhook(event_type)) {
    // not handling this event
    return res.send('OK');
  }

  if (event_type === 'PAYMENT_EXECUTED' || event_type === 'PAYMENT_FAILED') {
    // Handle webhooks when a payment gets executed or fails
    const {
      event_time,
      payment_id,
      payment_method_id,
      external_user_id, // ASSUMPTION: The storeganise user id is passed as external_user_id when creating any payment resource
      metadata,
    } = req.body;

    // Expectation: Should pass storeganise invoice id in metadata with key `storeganise_invoice_id`
    const storeganiseInvoiceId = metadata?.storeganise_invoice_id;

    if (typeof storeganiseInvoiceId !== 'string') {
      console.log(
        'Got non-string invoice id. Metadata does not contain appropriate storeganise_invoice_id'
      );
      return res.status(400).send('missing storeganise_invoice_id in metadata');
    }

    const invoice = await storeganiseSdk.getInvoice(storeganiseInvoiceId);

    // only process event if the storeganise invoice is in some non-final state
    if (isStoreganiseInvoicePayable(invoice.state) === false) {
      // storeganise invoice cannot be paid; should log some interal alert to manually investigate
      return res.status(500).send('internal error');
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
    } else {
      // if the payment failed, lets mark the invoice as failed
      await storeganiseSdk.setInvoiceStatus(storeganiseInvoiceId, 'failed');
    }

    return res.send('OK');
  }

  // if we are here, that means event_type = PAYMENT_LINK_SETUP_SUCCEEDED

  const { payment_method_id, external_user_id } = req.body;
  // ASSUMPTION: The storeganise user's id is passed to finverse as the external_user_id
  await storeganiseSdk.savePaymentMethod(payment_method_id, external_user_id);
  return res.send('OK');
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
 * Determine if a storeganise invoice is payable or not
 * @param {string} status
 */
function isStoreganiseInvoicePayable(status) {
  return ['draft', 'sent', 'pending', 'overdue', 'failed'].includes(status);
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
