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
  
  // Ensure parameters are strings and not undefined
  const safePaymentSessionId = (paymentSessionId || '').toString();
  const safeOrderId = (orderId || '').toString();
  
  if (!safePaymentSessionId) {
    throw new Error('Payment session ID is required');
  }
  
  if (!safeOrderId) {
    throw new Error('Order ID is required');
  }
  
  // Use production mode in production environment
  const mode = import.meta.env.PROD ? 'production' : 'sandbox';
  const cashfree = new window.Cashfree({ mode });
  
  // Build redirect URLs safely
  const baseUrl = 'https://fs-sports-clubv2.onrender.com';
  const paymentConfirmationUrl = `${baseUrl}/payment-confirmation?bookingId=${encodeURIComponent(safeOrderId)}`;
  const errorUrl = `${baseUrl}/?error=payment_failed`;
  const cancelUrl = `${baseUrl}/?error=payment_cancelled`;
  
  console.log('Initiating Cashfree payment:', {
    paymentSessionId: safePaymentSessionId,
    orderId: safeOrderId,
    redirectUrl: paymentConfirmationUrl
  });
  
  cashfree.checkout({
    paymentSessionId: safePaymentSessionId,
    redirectTarget: '_self',
    redirectUrl: paymentConfirmationUrl,
    onSuccess: (data: any) => {
      console.log('Payment success:', data);
      try {
        window.location.href = `/payment-confirmation?bookingId=${encodeURIComponent(safeOrderId)}`;
      } catch (error) {
        console.error('Navigation error on success:', error);
        window.location.replace(`/payment-confirmation?bookingId=${encodeURIComponent(safeOrderId)}`);
      }
    },
    onFailure: (data: any) => {
      console.log('Payment failed:', data);
      try {
        window.location.href = errorUrl;
      } catch (error) {
        console.error('Navigation error on failure:', error);
        window.location.replace(errorUrl);
      }
    },
    onClose: () => {
      console.log('Payment popup closed');
      try {
        window.location.href = cancelUrl;
      } catch (error) {
        console.error('Navigation error on close:', error);
        window.location.replace(cancelUrl);
      }
    }
  });
};
