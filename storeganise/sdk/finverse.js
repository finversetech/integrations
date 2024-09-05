// Note: This is a simple SDK that uses fetch to make API calls to Finverse.
// Finverse also supports a Typescript SDK: https://www.npmjs.com/package/@finverse/sdk-typescript
class FinverseSdk {
  /**
   * Finverse client id
   * @type string
   */
  clientId;
  /**
   * Finverse client secret
   * @type string
   */
  clientSecret;

  /**
   * @param {string} clientId
   * @param {string} clientSecret
   */
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Fetches a customer token
   *
   * Note: This token has a validitiy of 3600 seconds (= 60 mins, or 1 hour). This token can be cached and re-used.
   * For now we are fetching it before every API call for simplicity
   *
   * @returns {string} The finverse customer token which can be used to access the API
   */
  async fetchFinverseToken() {
    const { access_token } = await fetch(
      'https://api.prod.finverse.net/auth/customer/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': `${Date.now()}`,
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
        }),
      }
    ).then(async (r) => {
      if (r.ok) return r.json().catch(() => null);
      throw new Error(`Finverse token error`);
    });
    return access_token;
  }

  async fetchFinverse(path, { method = 'GET', body, headers = {} } = {}) {
    const accessToken = await this.fetchFinverseToken();

    // generic API call
    return fetch('https://api.prod.finverse.net/' + path, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body && { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body && JSON.stringify(body),
    }).then(async (r) => {
      if (r.ok) return r.json().catch(() => null);
      console.log(`Got finverse error: ${r.status}`);
      const errResponse = await r.text();
      throw new Error(`Finverse error: ${errResponse}`);
    });
  }

  /**
   * Fetch a finverse payment
   * @param {string} finversePaymentId
   * @returns the Finverse payment snapshot
   */
  async getPayment(finversePaymentId) {
    try {
      const resp = await this.fetchFinverse(`payments/${finversePaymentId}`);
      return resp;
    } catch (err) {
      console.log('got error fetching payment', err);
      throw err;
    }
  }
}

module.exports = {
  FinverseSdk,
};
