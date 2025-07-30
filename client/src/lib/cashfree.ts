// TypeScript declarations for Cashfree SDK
declare global {
  interface Window {
    Cashfree: any;
  }
}

export const loadCashfree = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(false);
    document.body.appendChild(script);
  });
};

export const initiateCashfreePayment = async (paymentSessionId: string, orderId: string) => {
  await loadCashfree();
  if (!window.Cashfree) throw new Error('Cashfree SDK not loaded');
  
  // Use production mode in production environment
  const mode = import.meta.env.PROD ? 'production' : 'sandbox';
  const cashfree = new window.Cashfree({ mode });
  
  cashfree.checkout({
    paymentSessionId,
    redirectTarget: '_self',
    onSuccess: (data: any) => {
      console.log('Payment successful:', data);
      // Redirect to confirmation page
      window.location.href = `/payment-confirmation?order_id=${orderId}`;
    },
    onFailure: (data: any) => {
      console.log('Payment failed:', data);
      // Redirect back to booking page with error
      window.location.href = `/?error=payment_failed`;
    },
    onClose: () => {
      console.log('Payment window closed');
      // User closed the payment window
      window.location.href = `/?error=payment_cancelled`;
    }
  });
}; 
