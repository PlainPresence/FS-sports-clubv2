// Add this at the top of the file or in a separate .d.ts file if needed
// declare module '@cashfreepayments/cashfree-js';
import { useRef, useEffect } from 'react';
import { load } from '@cashfreepayments/cashfree-js';

export function useCashfree() {
  const cashfreeRef = useRef<any>(null);

  useEffect(() => {
    const initializeSDK = async () => {
      cashfreeRef.current = await load({ mode: 'sandbox' });
    };
    initializeSDK();
  }, []);

  const initiateCashfreePayment = async (paymentSessionId: string) => {
    if (!cashfreeRef.current) {
      throw new Error('Cashfree SDK not loaded yet!');
    }
    cashfreeRef.current.checkout({
      paymentSessionId,
      redirectTarget: '_self',
    });
  };

  return initiateCashfreePayment;
} 
