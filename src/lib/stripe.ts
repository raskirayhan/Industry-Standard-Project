import Stripe from "stripe";
import config from "../config";

const stripeSecretKey =
  config.stripe_secret_key || "sk_test_placeholder_for_startup";

export const stripe = new Stripe(stripeSecretKey);
