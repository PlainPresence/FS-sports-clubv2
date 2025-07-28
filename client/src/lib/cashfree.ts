// Cashfree Drop-in Checkout integration utility

export const loadCashfree = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/ui/2.0.0/cashfree.sandbox.js'; // Use sandbox for testing
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(false);
    document.body.appendChild(script);
  });
};

export const initiateCashfreePayment = async (paymentSessionId: string) => {
  await loadCashfree();
  if (!window.Cashfree) throw new Error('Cashfree SDK not loaded');
  const cashfree = new window.Cashfree();
  cashfree.checkout({
    paymentSessionId,
    redirectTarget: '_self',
  });
}; 