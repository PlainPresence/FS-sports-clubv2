import { load } from '@cashfreepayments/cashfree-js';

export const initiateCashfreePayment = async (paymentSessionId: string) => {
  // Load and initialize the Cashfree SDK in sandbox mode
  const cashfree = await load({ mode: 'sandbox' });
  // Launch the checkout UI
  cashfree.checkout({
    paymentSessionId,
    redirectTarget: '_self',
  });
}; 
