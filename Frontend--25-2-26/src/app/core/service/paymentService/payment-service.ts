import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface CreateOrderResponse {
  success: boolean;
  data: {
    orderId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    key: string
  };
}

export interface verifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface verifyPaymentResponse {
  success: boolean;
  verified: boolean;
  data?: {
    orderId: string;
    payment: string;
    status: string;
  };
  message: string
}

export interface PaymentConfig {
  amount: number;
  currency: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  description?: string;
  notes?: Record<string, any>;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private apiUrl = 'http://localhost:3000/api/payment';
  private paymentSuccess$ = new Subject<verifyPaymentResponse>();
  private paymentError$ = new Subject<string>();

  constructor(private http: HttpClient) { }

  // Create order on backend and get Razorpay Order ID
  createOrder(amount: number, notes?: Record<string, any>):
    Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(`${this.apiUrl}/create-order`, { amount, notes });
  }


  // Verify payment signature on backend
  verifyPayment(paymentData: verifyPaymentRequest):
    Observable<verifyPaymentResponse> {
    return this.http.post<verifyPaymentResponse>(`${this.apiUrl}/verify-payment`, paymentData);
  }


  // Get order details
  getOrderDetails(orderId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/order/${orderId}`);
  }


  // Load Razorpay script dynamically
  loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';             //loads Razorpay’s checkout library
      script.async = true;             // Page won’t block while loading script
      script.onload = () => resolve(true);
      script.onerror = () => reject(false);
      document.body.appendChild(script)           //Script actually starts loading
    });
  }


  // Open Razorpay checkout Model
  openCheckout(config: PaymentConfig, razorpayOrderId: string, keyId: string):
    void {
    const options: any = {
      key: keyId,  // Razorpay Key ID (from backend)
      amount: config.amount,    // Amount in paise(smallest unit)
      currency: config.currency || 'INR',
      name: 'Masters Shop',   // Display name
      description: config.description || 'Purchase from your store',
      order_id: razorpayOrderId,  // Razorpay Order ID from backend

      prefill: {
        name: config.userName,
        email: config.userEmail,
        contact: config.userPhone
      },

      handler: (response: any) => {
        // Handle successful payment
        this.handlePaymentSuccess(response);
      },

      modal: {
        ondismiss: () => {
          this.handlePaymentDismiss();
        }
      },

      theme: {
        color: '#3399cc' // Customize color as needed
      },

      notes: config.notes || {}
    };

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Error opening Razorpay checkout:', error);
      this.paymentError$.next('Failed to open payment gateway');
    }
  }


  // Handle successful payment
  private handlePaymentSuccess(response: any): void {
    const paymentData: verifyPaymentRequest = {
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature
    };


    // Verify payment on Backend
    this.verifyPayment(paymentData).subscribe({
      next: (verifyResponse) => {
        this.paymentSuccess$.next(verifyResponse);
      },
      error: (error) => {
        console.error('Payment verification failed:', error);
        this.paymentError$.next('Payment verification failed. Please contact support.')
      }
    })
  }

  // Handle payment dismissal
  private handlePaymentDismiss(): void {
    this.paymentError$.next('Payment cancelled by user');
  }


  // Get payment success observable
  getPaymentSuccess(): Observable<verifyPaymentResponse> {
    return this.paymentSuccess$.asObservable();
  }

  // Get payment error observable
  getPaymentError(): Observable<string> {
    return this.paymentError$.asObservable();
  }
}
