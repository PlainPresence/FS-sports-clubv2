declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  handler: (response: any) => void;
  prefill: {
    name: string;
    email?: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
}

export const loadRazorpay = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export const initiateRazorpayPayment = async (options: {
  amount: number;
  bookingData: any;
  onSuccess: (paymentData: any) => void;
  onFailure: (error: any) => void;
}) => {
  const { amount, bookingData, onSuccess, onFailure } = options;

  try {
    const isLoaded = await loadRazorpay();
    if (!isLoaded) {
      throw new Error('Failed to load Razorpay SDK');
    }

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    const mode = import.meta.env.MODE;
    // If Razorpay key is not configured, only allow test mode in development
    if (!razorpayKey || razorpayKey === 'your_razorpay_key_id') {
      if (mode === 'development') {
        // Simulate payment for testing
        setTimeout(() => {
          const mockResponse = {
            razorpay_payment_id: `pay_test_${Date.now()}`,
            razorpay_order_id: `order_test_${Date.now()}`,
            razorpay_signature: 'test_signature',
            bookingData
          };
          onSuccess(mockResponse);
        }, 2000);
        return;
      } else {
        // In production, block booking and show error
        onFailure({ error: 'Payment gateway is not configured. Please contact support.' });
        return;
      }
    }

    const razorpayOptions: RazorpayOptions = {
      key: razorpayKey,
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      name: 'SportsTurf Pro',
      description: `${bookingData.sportType} booking for ${bookingData.date}`,
      handler: (response: any) => {
        onSuccess({
          ...response,
          bookingData,
        });
      },
      prefill: {
        name: bookingData.fullName,
        email: bookingData.email || '',
        contact: bookingData.mobile,
      },
      theme: {
        color: '#059669', // Primary green color
      },
      modal: {
        ondismiss: () => {
          onFailure({ error: 'Payment cancelled by user' });
        },
      },
    };

    const razorpay = new window.Razorpay(razorpayOptions);
    razorpay.open();
  } catch (error) {
    onFailure(error);
  }
};
