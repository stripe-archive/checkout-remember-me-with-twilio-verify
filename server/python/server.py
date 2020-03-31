#! /usr/bin/env python3.6

"""
server.py
Stripe Sample.
Python 3.6 or newer required.
"""

import stripe
from twilio.rest import Client
import json
import os

from flask import Flask, render_template, jsonify, request, send_from_directory
from dotenv import load_dotenv, find_dotenv

# Setup Stripe python client library
load_dotenv(find_dotenv())
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
stripe.api_version = os.getenv('STRIPE_API_VERSION')

# Set up Twilio client
client = Client(os.getenv('ACCOUNT_SID'), os.getenv('AUTH_TOKEN'))

static_dir = str(os.path.abspath(os.path.join(
    __file__, "..", os.getenv("STATIC_DIR"))))
app = Flask(__name__, static_folder=static_dir,
            static_url_path="", template_folder=static_dir)

# For demo purposes we're hardcoding the amount and currency here.
# Replace this with your own inventory/cart/order logic.
purchase = {
    'amount': 1099,
    'currency': 'USD'
}


def create_purchase(items):
    # Extend this function with your logic to validate
    # the purchase details server-side and prevent
    # manipulation of price details on the client.
    return purchase


@app.route('/', methods=['GET'])
def get_checkout_page():
    # Display checkout page
    return render_template('index.html')


@app.route('/config', methods=['GET'])
def get_PUBLISHABLE_KEY():
    return jsonify({
        'publishableKey': os.getenv('STRIPE_PUBLISHABLE_KEY'),
        'purchase': purchase
    })


@app.route('/create-customer', methods=['POST'])
def create_customer():
    data = json.loads(request.data)

    try:
        # Validate the phone number input
        lookup = client.lookups.phone_numbers(data['phone']).fetch() 

        # Create a new customer object
        customer = stripe.Customer.create(
            phone=lookup.phone_number,
            email=data['email']
        )

        # Create a CheckoutSession to set up our payment methods recurring usage
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="setup",
            customer=customer.id,
            success_url=request.environ['HTTP_ORIGIN'] +
            "/?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=request.environ['HTTP_ORIGIN']
        )
        return jsonify({'customer': customer, 'checkoutSession': checkout_session})
    except Exception as e:
        return jsonify(error={'message': str(e)}), 400


@app.route('/checkout-session/<id>', methods=['GET'])
def get_checkout_session(id):
    checkout_session = stripe.checkout.Session.retrieve(
        id, expand=['customer', 'setup_intent.payment_method'])
    return jsonify(checkoutSession=checkout_session)


@app.route('/start-twilio-verify', methods=['POST'])
def start_twilio_verify():
    data = json.loads(request.data)

    try:
        # Retrieve the customer object
        customer = stripe.Customer.retrieve(data['customerId'])

        # Start Twilio verify
        verification = client.verify \
            .services(os.getenv('VERIFY_SERVICE_SID')) \
            .verifications \
            .create(to=customer.phone, channel='sms')

        return jsonify(status=verification.status)
    except Exception as e:
        return jsonify(error={'message': str(e)}), 400


@app.route('/check-twilio-verify', methods=['POST'])
def check_twilio_verify():
    data = json.loads(request.data)

    try:
        # Retrieve the customer object
        customer = stripe.Customer.retrieve(data['customerId'])

        # Check Twilio verify code
        verification_check = client.verify \
            .services(os.getenv('VERIFY_SERVICE_SID')) \
            .verification_checks \
            .create(to=customer.phone, code=data['code'])

        # If successful, create the payment with the stored card
        if verification_check.status == 'approved':
            # Get the stored payment method
            payment_methods = stripe.PaymentMethod.list(
                customer=customer.id,
                type="card",
            )

            if len(payment_methods.data) != 1:
                raise ValueError('Too few or too many methods on customer!')

            # Charge the stored method
            purchase = create_purchase(data['items'])
            intent = stripe.PaymentIntent.create(
                amount=purchase['amount'],
                currency=purchase['currency'],
                customer=customer.id,
                payment_method=payment_methods.data[0].id,
                off_session=False,  # Customer is on-session during checkout
                confirm=True  # Confirm and charge payment immediately
            )

            # Return the payment result
            return jsonify(paymentIntent=intent)

        else:
            return jsonify(error={'message': 'Incorrect code. Please try again!'}), 400

    except Exception as e:
        return jsonify(error={'message': str(e)}), 400


@app.route('/webhook', methods=['POST'])
def webhook_received():
    # You can use webhooks to receive information about asynchronous payment events.
    # For more about our webhook events check out https://stripe.com/docs/webhooks.
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    request_data = json.loads(request.data)

    if webhook_secret:
        # Retrieve the event by verifying the signature using the raw body and secret if webhook signing is configured.
        signature = request.headers.get('stripe-signature')
        try:
            event = stripe.Webhook.construct_event(
                payload=request.data, sig_header=signature, secret=webhook_secret)
            data = event['data']
        except Exception as e:
            return e
        # Get the type of webhook event sent - used to check the status of PaymentIntents.
        event_type = event['type']
    else:
        data = request_data['data']
        event_type = request_data['type']
    data_object = data['object']

    if event_type == 'payment_intent.succeeded':
        print('💰 Payment received!')
        # Fulfill any orders, e-mail receipts, etc
        # To cancel the payment you will need to issue a Refund (https://stripe.com/docs/api/refunds)
    elif event_type == 'payment_intent.payment_failed':
        print('❌ Payment failed.')

    return jsonify({'received': True})


if __name__ == '__main__':
    app.run(port=4242)
