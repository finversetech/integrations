// This function will handle the incoming HTTP request (i.e. the webhook)
async function finverseWebhookHandler(req, res, finverseSdk, storeganiseSdk) {
  // TODO: Should verify signature of webhook and ensure it is from Finverse

  // will handle payments webhooks
  if (req.path === '/payments') {
    const {
      event_type,
      event_time,
      payment_id,
      payment_method_id,
      external_user_id,
      metadata,
    } = req.body;
    if (event_type !== 'PAYMENT_EXECUTED' && event_type !== 'PAYMENT_FAILED') {
      // only handle payment success/failure
      return res.send('OK');
    }

    // Expectation: Should pass storeganise invoice id in metadata with key `sg_invoice_id`
    const storeganiseInvoiceId = metadata?.sg_invoice_id;
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
      const paymentAmount = convertFinverseAmountToStoreganiseAmount(
        payment.amount
      );

      // Record the payment on the storeganise invoice
      await storeganiseSdk.writePaymentToInvoice(
        storeganiseInvoiceId,
        paymentAmount,
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

/**
 * Converts finverse amount (in cents) to storeganise amount (in dollars)
 * @param {number} amount - Finverse amount in cents (expect to always be an integer)
 */
function convertFinverseAmountToStoreganiseAmount(amount) {
  // we cannot just do /100 here because js can have float bugs
  const strAmount = amount.toString();
  const dividedAmountInString = `${strAmount.substring(
    0,
    strAmount.length - 2
  )}.${strAmount.length - 2}`;
  return parseFloat(dividedAmountInString);
}

module.exports = {
  finverseWebhookHandler,
};
