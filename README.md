# Checkout remember me with Twilio Verify

This sample uses Stripe Checkout to [collect payment details](https://stripe.com/docs/payments/checkout/collecting) for future payments and uses [Twilio Verify](https://www.twilio.com/verify) to authenticate the customer via SMS code and [charge their stored card](https://stripe.com/docs/payments/save-and-reuse#web-create-payment-intent-off-session).

## Demo

See a [hosted version](https://ldmsw.sse.codesandbox.io/) of the sample or fork a copy on [CodeSandbox](https://codesandbox.io/s/github/stripe-samples/checkout-remember-me-with-twilio-verify/tree/codesandbox).

<details open><summary>Set up the card with Stripe Checkout</summary>
<img src="https://github.com/thorsten-stripe/demo-gifs/blob/master/twilio-verify-signup.gif?raw=true" alt="Checkout setup demo gif" align="center">
</details>

<details open><summary>Authenticate the customer with Twilio Verify</summary>
<img src="https://github.com/thorsten-stripe/demo-gifs/blob/master/twilio-verify-pay.gif?raw=true" alt="Twilio verify demo gif" align="center">
</details>

## Features:

- ☎️ Validate phone number with [intl-tes-input](https://github.com/jackocnr/intl-tel-input) and [Twilio lookup](https://www.twilio.com/docs/lookup/tutorials/validation-and-formatting#format-an-international-phone-number)
- 💳🔒Securely collect payment details with Stripe Checkout setup mode.
- 📱✉️ Authenticate the customer with Twilio Verify and charge their stored card.

## How to run locally

This sample includes 2 server implementations in [Javascript (Node)](/server/node), and [Python](/server/python). Both servers implement the same endpoints and logic for the client to consume.

**1. Clone and configure the sample**

The Stripe CLI is the fastest way to clone and configure a sample to run locally.

**Using the Stripe CLI**

If you haven't already installed the CLI, follow the [installation steps](https://github.com/stripe/stripe-cli#installation) in the project README. The CLI is useful for cloning samples and locally testing webhooks and Stripe integrations.

In your terminal shell, run the Stripe CLI command to clone the sample:

```
stripe samples create checkout-remember-me-with-twilio-verify
```

The CLI will walk you through picking your integration type, server and client languages, and will configure your `.env` file with your Stripe API keys and secrets.

**Installing and cloning manually**

If you do not want to use the Stripe CLI, you can manually clone and configure the sample yourself:

```
git clone https://github.com/stripe-samples/checkout-remember-me-with-twilio-verify.git
```

Copy the `.env.example` file into a file named `.env` in the folder of the server you want to use. For example:

```
cp .env.example server/node/.env
```

### Environment variables

This project requires some environment variables to be set. To keep your tokens and secrets secure, make sure to not commit the `.env` file in git. This project includes a `.gitignore` file that excludes `.env` from the version history.

In your `.env` file, set the following values:

| Variable                 | Meaning                                                                      | Required |
| :----------------------- | :--------------------------------------------------------------------------- | :------- |
| `STRIPE_PUBLISHABLE_KEY` | Find in your [Stripe Dahsboard](https://dashboard.stripe.com/test/apikeys)   | Yes      |
| `STRIPE_SECRET_KEY`      | Find in your [Stripe Dahsboard](https://dashboard.stripe.com/test/apikeys)   | Yes      |
| `ACCOUNT_SID`            | Find in the Twilio [console](https://www.twilio.com/console)                 | Yes      |
| `AUTH_TOKEN`             | Find in the Twilio [console](https://www.twilio.com/console)                 | Yes      |
| `VERIFY_SERVICE_SID`     | Find in the Twilio [console](https://www.twilio.com/console/verify/services) | Yes      |
| `STATIC_DIR`             | Tells the server where to the client files are located.                      | Yes      |

**2. Follow the server instructions on how to run:**

Pick the server language you want and follow the instructions in the server folder README on how to run.

For example, if you want to run the Node server:

```
cd server/node # there's a README in this folder with instructions
npm install
npm start
```

**3. [Optional] Run a webhook locally:**

If you want to test the `using-webhooks` integration with a local webhook on your machine, you can use the Stripe CLI to easily spin one up.

Make sure to [install the CLI](https://stripe.com/docs/stripe-cli) and [link your Stripe account](https://stripe.com/docs/stripe-cli#link-account).

```
stripe listen --forward-to localhost:4242/webhook
```

The CLI will print a webhook secret key to the console. Set `STRIPE_WEBHOOK_SECRET` to this value in your `.env` file.

You should see events logged in the console where the CLI is running.

When you are ready to create a live webhook endpoint, follow our guide in the docs on [configuring a webhook endpoint in the dashboard](https://stripe.com/docs/webhooks/setup#configure-webhook-settings).

**4. Use test cards**

When the app is running, use `4242424242424242` as a test card number with any CVC code + a future expiration date.

Use the `4000000000003220` test card number to trigger a 3D Secure challenge flow.

Read more about testing on Stripe at https://stripe.com/docs/testing.

## FAQ

Q: Why did you pick these frameworks?

A: We chose the most minimal framework to convey the key Stripe calls and concepts you need to understand. These demos are meant as an educational tool that helps you roadmap how to integrate Stripe within your own system independent of the framework.

## Get support
If you found a bug or want to suggest a new [feature/use case/sample], please [file an issue](../../issues).

If you have questions, comments, or need help with code, we're here to help:
- on [Discord](https://stripe.com/go/developer-chat)
- on Twitter at [@StripeDev](https://twitter.com/StripeDev)
- on Stack Overflow at the [stripe-payments](https://stackoverflow.com/tags/stripe-payments/info) tag
- by [email](mailto:support+github@stripe.com)

Sign up to [stay updated with developer news](https://go.stripe.global/dev-digest).

## Author

- [@thorsten-stripe](https://twitter.com/thorwebdev)
