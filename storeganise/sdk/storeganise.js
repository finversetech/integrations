class StoreganiseSdk {
  /**
   * The entity's business code. This determines which URL to hit
   * @type string
   */
  businessCode;
  /**
   * The api key grants access to storeganise APIs
   * @type string
   */
  apiKey;

  /**
   *
   * @param {string} businessCode
   * @param {string} apiKey
   */
  constructor(businessCode, apiKey) {
    this.businessCode = businessCode;
    this.apiKey = apiKey;
  }

  async fetchSg(path, { method, body, params } = {}) {
    return fetch(
      `https://${this.businessCode}.storeganise.com/api/v1/admin/${path}` +
        (params
          ? '?' +
            Object.entries(params || {})
              .map(([k, v]) =>
                [k, v && encodeURIComponent(v)]
                  .filter((x) => x != null)
                  .join('=')
              )
              .join('&')
          : ''),
      {
        method,
        headers: {
          Authorization: `ApiKey ${this.apiKey}`,
          ...(body && { 'Content-Type': 'application/json' }),
        },
        body: body && JSON.stringify(body),
      }
    ).then(async (r) => {
      const data = await r.json().catch(() => ({}));
      if (r.ok) return data;
      throw Object.assign(new Error('sg'), { status: r.status, ...data.error });
    });
  }

  /**
   * Save finverse payment method to storeganise user.
   * @param {string} finversePaymentMethodId
   * @param {string} storeganiseUserId
   */
  async savePaymentMethod(finversePaymentMethodId, storeganiseUserId) {
    try {
      await this.fetchSg(`users/${storeganiseUserId}`, {
        method: 'PUT',
        body: {
          billing: {
            id: finversePaymentMethodId,
            type: 'custom',
          },
        },
      });
      console.log(
        `saved payment method ${finversePaymentMethodId} to ${storeganiseUserId}`
      );
    } catch (err) {
      console.log('Got error saving payment method', err);
      throw err;
    }
  }

  /**
   * Add a payment to Storeganise invoice
   * @param {string} storeganiseInvoiceId
   * @param {number} paymentAmount - amount in dollars, i.e. for a `$12.34` payment, the value should be `12.34`
   * @param {string} paymentTime - time in ISO string format (YYYY-MM-DDTHH:mm:ss.0000Z)
   * @param {string} finversePaymentId
   */
  async writePaymentToInvoice(
    storeganiseInvoiceId,
    paymentAmount,
    paymentTime,
    finversePaymentId
  ) {
    try {
      await this.fetchSg(`invoices/${storeganiseInvoiceId}/payments`, {
        method: 'POST',
        body: {
          amount: paymentAmount,
          date: paymentTime.split('T')[0], // convert ISO string format to YYYY-MM-DD
          method: 'other',
          notes: `Finverse payment ${finversePaymentId}`,
          type: 'manual',
        },
      });
      console.log(
        `Wrote amount ${paymentAmount} to invoice ${storeganiseInvoiceId}`
      );
    } catch (err) {
      console.log('Got error writing payment to invoice', err);
      throw err;
    }
  }

  /**
   * Fetch a specific storeganise invoice
   * @param {string} storeganiseInvoiceId
   * @returns The storeganise invoice object
   */
  async getInvoice(storeganiseInvoiceId) {
    try {
      const resp = await this.fetchSg(`invoices/${storeganiseInvoiceId}`);
      console.log(`Fetched invoice ${storeganiseInvoiceId}`);
      return resp;
    } catch (err) {
      console.log('got error fetching invoice', err);
      throw err;
    }
  }

  /**
   * Update status of storeganise invoice
   * @param {string} storeganiseInvoiceId
   * @param {string} status - can be value `paid` or `failed`
   */
  async setInvoiceStatus(storeganiseInvoiceId, status) {
    try {
      await this.fetchSg(`invoices/${storeganiseInvoiceId}`, {
        method: 'PUT',
        body: {
          state: status,
        },
      });
      console.log(`Set invoice ${storeganiseInvoiceId} to status ${status}`);
    } catch (err) {
      console.log('Got error setting invoice status ', err);
      throw err;
    }
  }
}

module.exports = {
  StoreganiseSdk,
};
