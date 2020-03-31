// Replace if using a different env file or config.
require("dotenv").config({ path: "./.env" });
const express = require("express");
const app = express();
const { resolve } = require("path");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const client = require("twilio")(
  process.env.ACCOUNT_SID,
  process.env.AUTH_TOKEN
);

// For demo purposes we're hardcoding the amount and currency here.
// Replace this with your own inventory/cart/order logic.
const purchase = {
  amount: 1099,
  currency: "USD"
};

const createPurchase = items => {
  // Extend this function with your logic to validate
  // the purchase details server-side and prevent
  // manipulation of price details on the client.
  return purchase;
};

app.use(express.static(process.env.STATIC_DIR));
// Use JSON parser for all non-webhook routes.
app.use((req, res, next) => {
  if (req.originalUrl === "/webhook") {
    next();
  } else {
    bodyParser.json()(req, res, next);
  }
});

app.get("/config", (req, res) => {
  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    purchase
  });
});

app.get("/", (req, res) => {
  const path = resolve(process.env.STATIC_DIR + "/index.html");
  res.sendFile(path);
});

app.post("/create-customer", async (req, res) => {
  const { phone, email } = req.body;
  try {
    // Validate the phone number input
    const number = await client.lookups.phoneNumbers(phone).fetch();
    // Create a new customer object
    const customer = await stripe.customers.create({
      phone: number.phoneNumber,
      email
    });

    // Create a CheckoutSession to set up our payment methods recurring usage
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "setup",
      customer: customer.id,
      success_url: `${req.headers.origin}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/`
    });

    res.send({ customer, checkoutSession });
  } catch (error) {
    res.status(400).send({ error });
  }
});

app.get("/checkout-session/:id", async (req, res) => {
  const { id } = req.params;

  const checkoutSession = await stripe.checkout.sessions.retrieve(id, {
    expand: ["customer", "setup_intent.payment_method"]
  });

  res.send({ checkoutSession });
});

app.post("/start-twilio-verify", async (req, res) => {
  const { customerId } = req.body;

  // Retrieve the customer object
  const customer = await stripe.customers.retrieve(customerId);

  // Start Twilio verify
  const verification = await client.verify
    .services(process.env.VERIFY_SERVICE_SID)
    .verifications.create({ to: customer.phone, channel: "sms" });

  // Send the PaymentIntent client_secret to the client.
  const status = verification.status;
  res.send({ status });
});

app.post("/check-twilio-verify", async (req, res) => {
  const { customerId, code, items } = req.body;

  try {
    // Retrieve the customer object
    const customer = await stripe.customers.retrieve(customerId);

    // Check Twilio verify code
    const verificationCheck = await client.verify
      .services(process.env.VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: customer.phone, code });

    // If successful, create the payment with the stored card
    if (verificationCheck.status === "approved") {
      // Get the stored payment method
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card"
      });
      if (paymentMethods.data.length !== 1) {
        throw new Error("Too few or too many methods on customer!");
      }
      // Charge the stored method
      const { amount, currency } = createPurchase(items);
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        payment_method: paymentMethods.data[0].id,
        off_session: false, // Customer is on-session during checkout
        confirm: true // Confirm and charge payment immediately
      });

      // Return the payment result
      res.send({ paymentIntent });
    } else {
      res
        .status(400)
        .send({ error: { message: "Incorrect code. Please try again!" } });
    }
  } catch (error) {
    res.status(400).send({ error });
  }
});

// Stripe requires the raw body to construct the event.
app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  (req, res) => {
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      // On error, log and return the error message
      console.log(`❌ Error message: ${error.message}`);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    if (event.type === "payment_intent.succeeded") {
      // Funds have been captured
      // Fulfill any orders, e-mail receipts, etc
      // To cancel the payment after capture you will need to issue a Refund (https://stripe.com/docs/api/refunds)
      console.log("💰 Payment captured!");
    } else if (event.type === "payment_intent.payment_failed") {
      console.log("❌ Payment failed.");
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
  }
);

app.listen(4242, () => console.log(`Node server listening on port ${4242}!`));
