/**
 * Checks if a given JWT token is valid (i.e. it expires >5 seconds from now)
 * @param {string} token
 * @returns true if token is valid, false if it needs to be refreshed
 */
function isTokenValid(token) {
  if (typeof token !== 'string' || token === '') {
    return false;
  }

  const jwtPayloadStr = token.split('.')[1];
  if (!jwtPayloadStr) {
    return false;
  }

  const decodedJwtPayload = (() => {
    try {
      return JSON.parse(atob(jwtPayloadStr));
    } catch {
      return null;
    }
  })();

  if (decodedJwtPayload === null) {
    return false;
  }

  const expiryInMs = decodedJwtPayload.exp * 1000;
  const currentTime = new Date().getTime();

  // token is valid if token is valid for >5 seconds
  return expiryInMs - currentTime > 5000;
}

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
   * The finverse JWT token that is used to access the API endpoints
   * @type string
   */
  token;

  /**
   * @param {string} clientId
   * @param {string} clientSecret
   */
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.token = '';
  }

  async fetchFinverse(path, { method = 'GET', body, headers = {} } = {}) {
    if (!isTokenValid(this.token)) {
      // Get an access_token. We will use this to authenticate the request to Finverse
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
      this.token = access_token;
    }

    // generic API call
    return fetch('https://api.prod.finverse.net/' + path, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
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
  isTokenValid,
};
