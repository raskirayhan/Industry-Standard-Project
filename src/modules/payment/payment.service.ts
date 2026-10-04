import config from "../../config";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";
import { RequestUser } from "../../middlewares/auth";
import crypto from 'crypto';

// Stripe minimum charge requirement is equivalent to $0.50 USD.
// For BDT (Bangladeshi Taka), ~65 BDT ensures Stripe conversion threshold is met.
const MIN_STRIPE_BDT_AMOUNT = 70;



const initiatePaymentSession = async (user: RequestUser, shipmentId: string) => {
  if (!shipmentId) {
    throw new Error("shipmentId is required");
  }

  let shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      deletedAt: null
    },
    include: {
      customer: true
    }
  });

  if (!shipment) {
    throw new Error("Shipment Not Found");
  }

  if (user.role === 'CUSTOMER' && shipment.customer.userId !== user.userId) {
    throw new Error('Unauthorized Access');
  }

  if (shipment.status !== 'PAYMENT_PENDING') {
    throw new Error(`This Parcel Status ${shipment.status},This Is Not The Right Payment Status`);
  }

  // Repair shipment totalCost if it was saved incorrectly (e.g. totalCost < baseFare)
  const expectedMinCost = shipment.baseFare + shipment.surcharge;
  if (shipment.totalCost < expectedMinCost) {
    shipment = await prisma.shipment.update({
      where: { id: shipment.id },
      data: { totalCost: expectedMinCost },
      include: { customer: true }
    });
  }

  // Check for existing pending payment to avoid orphaned duplicate PENDING records
  let payment = await prisma.payment.findFirst({
    where: {
      shipmentId: shipment.id,
      userId: user.userId,
      status: 'PENDING',
      deletedAt: null
    }
  });

  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        shipmentId: shipment.id,
        userId: user.userId,
        amount: shipment.totalCost,
        currency: 'BDT',
        gateway: 'STRIPE',
        status: 'PENDING'
      }
    });
  } else if (payment.amount !== shipment.totalCost) {
    payment = await prisma.payment.update({
      where: { id: payment.id },
      data: { amount: shipment.totalCost }
    });
  }

  // Enforce Stripe's minimum amount requirement for BDT to avoid "convert to at least 50 cents" error
  const chargableAmount = Math.max(shipment.totalCost, MIN_STRIPE_BDT_AMOUNT);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: 'bdt',
          product_data: {
            name: `Courier Delivery - Track: ${shipment.trackingNumber}`,
            description: `From: ${shipment.senderAddress} To: ${shipment.receiverAddress}`
          },
          unit_amount: Math.round(chargableAmount * 100),
        },
        quantity: 1,
      }
    ],
    metadata: {
      shipmentId: shipment.id,
      paymentId: payment.id,
      userId: user.userId
    },
    success_url: `${config.app_url || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.app_url || 'http://localhost:3000'}/payment/cancel`,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { gatewaySessionId: session.id }
  });

  return {
    checkoutUrl: session.url,
    paymentId: payment.id,
    amount: shipment.totalCost,
    currency: 'BDT'
  };
};

const handleStripeWebhook = async (payload: Buffer, signature: string) => {
  let event: any;

  const webhookSecret = config.stripe_webhook_key || process.env.STRIPE_WEBHOOK_KEY || process.env.STRIPE_WEBHOOK_SECRET;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret as string
    );
  } catch (err: any) {
    throw new Error(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { shipmentId, paymentId, userId } = session.metadata;

    const deliveryOtp = crypto.randomInt(100000, 999999).toString();

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'SUCCESS',
          transactionId: session.payment_intent as string,
          gatewayResponse: session as any,
        },
      });

      const updatedShipment = await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          status: 'PAID',
          deliveryOtp,
          version: { increment: 1 },
        },
      });

      await tx.shipmentLog.create({
        data: {
          shipmentId: updatedShipment.id,
          fromStatus: 'PAYMENT_PENDING',
          toStatus: 'PAID',
          performedById: userId,
          remarks: `Stripe-এ সফল পেমেন্ট (TrxID: ${session.payment_intent})`,
        },
      });
    });
  }

  return { received: true };
};

const getPaymentDetailsFromDB = async (id: string) => {
  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        { id: id },
        { shipmentId: id }
      ],
      deletedAt: null
    },
    include: {
      shipment: { select: { trackingNumber: true, status: true, totalCost: true } },
    },
  });

  if (!payment) throw new Error('Payment Record Not Found');
  return payment;
};

export const paymentService = {
  initiatePaymentSession,
  handleStripeWebhook,
  getPaymentDetailsFromDB
};