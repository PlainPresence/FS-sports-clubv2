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
  const cashfree = new window.Cashfree({ mode });cashfree.checkout({
    paymentSessionId,
    redirectTarget: '_self',
    redirectUrl: `https://fs-sports-clubv2.onrender.com/payment-confirmation?bookingId=${orderId}`,
redirectUrl: `https://fs-sports-clubv2.onrender.com/payment-confirmation?bookingId=${orderId}`,
    onSuccess: (data: any) => {
      window.location.href = `/payment-confirmation?bookingId=${orderId}`;
      window.location.href = `/payment-confirmation?bookingId=${orderId}`;
    },
    onFailure: (data: any) => {
      window.location.href = `/?error=payment_failed`;
    },
    onClose: () => {
      window.location.href = `/?error=payment_cancelled`;
    }
  });
}; 
