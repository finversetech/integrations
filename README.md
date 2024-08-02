# integrations
Integrations of Finverse with third-party services

# Supported integrations

## Storeganise
Handle the following Finverse webhooks:

### Payment webhooks
* Handle `PAYMENT_EXECUTED` and `PAYMENT_FAILED` webhooks
* When payment is executed with a payment method, then save payment method to storeganise user
* When payment is executed, write payment amount to storeganise invoice and mark invoice as `paid`
* When payment is failed, mark invoice as `failed`

### Payment links webhooks
* Handle `PAYMENT_LINK_SETUP_SUCCEEDED` webhook
* When payment link has completed setup, then save the payment method to storeganise user