// A reference to Stripe.js
let stripe;
let purchase;
var signupForm = document.getElementById("signup-form");
var paymentForm = document.getElementById("payment-form");
var verifyForm = document.getElementById("verify-form");

fetch("/config")
  .then(function(result) {
    return result.json();
  })
  .then(async function(data) {
    stripe = Stripe(data.publishableKey);
    purchase = data.purchase;
    // Show formatted price information.
    const price = (purchase.amount / 100).toFixed(2);
    const numberFormat = new Intl.NumberFormat(["en-US"], {
      style: "currency",
      currency: purchase.currency,
      currencyDisplay: "symbol"
    });
    document.getElementById("order-amount").innerText = numberFormat.format(
      price
    );
    // Format phone number input field
    const phoneInputField = document.querySelector("#phone");
    const phoneInput = window.intlTelInput(phoneInputField, {
      separateDialCode: true,
      utilsScript:
        "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/16.0.11/js/utils.js"
    });

    // Handle signup form submission.
    signupForm.addEventListener("submit", async event => {
      event.preventDefault();
      if (!phoneInput.isValidNumber()) {
        // Invlaid phone number, return error message, abort
        phoneInputField.setCustomValidity("Invalid phone number!");
        signupForm.reportValidity();
        setTimeout(function() {
          phoneInputField.setCustomValidity("");
        }, 4000);
        return;
      }
      changeLoadingState(true, 0);
      // Create Customer
      const { checkoutSession, error } = await createCustomer({
        phone: phoneInput.getNumber()
      });
      if (error) {
        alert(error.message);
        changeLoadingState(false, 0);
        return;
      }
      // Recirect to Checkout
      await stripe.redirectToCheckout({ sessionId: checkoutSession.id });
    });

    // Check if customer is returning from Checkout
    const url = new URL(window.location.href);
    const session_id = url.searchParams.get("session_id");
    if (session_id) {
      document.getElementById("signup-view").classList.add("hidden");
      document.getElementById("payment-view").classList.remove("hidden");

      const { checkoutSession } = await fetch(
        `checkout-session/${session_id}`
      ).then(res => res.json());

      if (checkoutSession) {
        // Store customer details in localStorage
        localStorage.setItem(
          "customer",
          JSON.stringify({
            id: checkoutSession.customer.id,
            email: checkoutSession.customer.email,
            last4: checkoutSession.setup_intent.payment_method.card.last4
          })
        );
        window.location.replace("/");
      }
    }

    // Check if customer has been remembered
    const rememberedCustomer = JSON.parse(localStorage.getItem("customer"));
    if (rememberedCustomer) {
      document.getElementById("signup-view").classList.add("hidden");
      document.getElementById("payment-view").classList.remove("hidden");
      document.getElementsByClassName(
        "button-text"
      )[1].innerText = `Pay with card ending in ${rememberedCustomer.last4}`;
      document.getElementById("customer-email").innerText =
        rememberedCustomer.email;

      document.getElementById("forget-me").addEventListener("click", e => {
        localStorage.removeItem("customer");
      });

      paymentForm.addEventListener("submit", async event => {
        event.preventDefault();
        changeLoadingState(true, 1);
        const verificationResponse = await fetch("/start-twilio-verify", {
          method: "post",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ customerId: rememberedCustomer.id })
        }).then(res => res.json());

        if (verificationResponse.status === "pending") {
          document.getElementById("payment-view").classList.add("hidden");
          document.getElementById("verify-view").classList.remove("hidden");

          verifyForm.addEventListener("submit", async event => {
            event.preventDefault();
            changeLoadingState(true, 2);

            const { error, paymentIntent } = await fetch(
              "/check-twilio-verify",
              {
                method: "post",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  customerId: rememberedCustomer.id,
                  code: document.getElementById("verify-code").value,
                  items: ["cart_item"]
                })
              }
            ).then(res => res.json());

            if (error) {
              showError(error.message);
            } else {
              if (paymentIntent.status === "requires_action") {
                // The payment requires bank authentication
                orderComplete(
                  await stripe.confirmCardPayment(paymentIntent.client_secret)
                );
              } else {
                orderComplete(paymentIntent);
              }
            }
          });
        }
      });
    }
  });

async function createCustomer({ phone }) {
  return await fetch("/create-customer", {
    method: "post",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      phone,
      email: document.querySelector("#email").value
    })
  }).then(res => res.json());
}

/* ------- Post-payment helpers ------- */

/* Shows a success / error message when the payment is complete */
function orderComplete(paymentIntent) {
  const paymentIntentJson = JSON.stringify(paymentIntent, null, 2);

  document.querySelector("#verify-form").classList.add("hidden");
  document.querySelector("pre").textContent = paymentIntentJson;

  document.querySelector(".sr-result").classList.remove("hidden");
  setTimeout(function() {
    document.querySelector(".sr-result").classList.add("expand");
  }, 200);
}

function showError(errorMsgText) {
  changeLoadingState(false, 2);
  const errorMsg = document.querySelector(".sr-field-error");
  errorMsg.textContent = errorMsgText;
  setTimeout(function() {
    errorMsg.textContent = "";
  }, 4000);
}

// Show a spinner on payment submission
function changeLoadingState(isLoading, i) {
  if (isLoading) {
    document.getElementsByTagName("button")[i].disabled = true;
    document.getElementsByClassName("spinner")[i].classList.remove("hidden");
    document.getElementsByClassName("button-text")[i].classList.add("hidden");
  } else {
    document.getElementsByTagName("button")[i].disabled = false;
    document.getElementsByClassName("spinner")[i].classList.add("hidden");
    document
      .getElementsByClassName("button-text")
      [i].classList.remove("hidden");
  }
}
