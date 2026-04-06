// import { Component, Inject, model, OnInit } from '@angular/core';
// import { PaymentService } from '../../core/service/paymentService/payment-service';
// import { CartService } from '../../core/service/cartService/cart-service';
// import { AuthService } from '../../core/service/authService/auth-service';
// import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
// import { from, lastValueFrom } from 'rxjs';


// declare var $: any;  //jQuery
// declare var Razorpay: any;

// @Component({
//   selector: 'app-payment-jquery',
//   imports: [],
//   templateUrl: './payment-jquery.html',
//   styleUrl: './payment-jquery.css',
// })
// export class PaymentJQuery implements OnInit {
//   isLoading = true;
//   isProcessing = false;
//   errorMessage = '';
//   successMessage = '';

//   cartTotal: number = 0;
//   orderId: string = '';
//   razorpayOrderId: string = '';

//   constructor(
//     public dialogRef: MatDialogRef<PaymentJQuery>,
//     @Inject(MAT_DIALOG_DATA) public data: any,
//     private paymentService: PaymentService,
//     private cartService: CartService,
//     private authService: AuthService
//   ) {
//     this.cartTotal = data.carttotal || 0;
//   }

//   async ngOnInit(): Promise<void> {
//     try {
//       // Load Razorpay script
//       await this.paymentService.loadRazorpayScript();

//       // create order using jQuery AJAX
//     } catch (error) {
//       this.errorMessage = 'Failed to initialize payment. Please refresh and try again.';
//       this.isLoading = false;
//     }
//   }


//   // Step: 1 Create Order using jQuery AJAX
//   createOrder(): void {
//     const apiUrl = '/api/payment/create-order';   // your backend endpoint

//     // jQuery AJAX Call
//     $.ajax({
//       url: apiUrl,
//       type: 'POST',  // HTTP Method
//       dataType: 'json',    // Expected response format

//       success: (response: any) => {
//         console.log('Order created successfully:', response);

//         if (response.success) {
//           this.orderId = response.data.orderId;
//           this.razorpayOrderId = response.data.razorpayOrderId;
//           this.isLoading = false;
//         } else {
//           this.errorMessage = response.message || 'Failed to create order';
//           this.isLoading = false;
//         }
//       },

//       error: (xhr: any, status: any, error: any) => {
//         console.error('Error creating order:', error);
//         console.error('Status:', status);
//         console.error('Response:', xhr.responseText);

//         this.errorMessage = xhr.responseJSON?.message || 'Failed to create order';
//         this.isLoading = false;
//       }
//     })
//   }


//   // Step 2: Open Razorpay Checkout

//   openrazorpayCheckout(): void {
//     if (!this.razorpayOrderId) {
//       this.errorMessage = 'Order ID not received. Please try again.';
//       return;
//     }

//     const user = this.authService.refreshMe();

//     const options = {
//       key: (window as any).RAZORPAY_KEY,
//       order_id: this.razorpayOrderId,
//       amount: Math.round(this.cartTotal * 100),   // Paise
//       currency: 'INR',
//       name: 'Masters Shop',
//       description: `Order for ${this.cartTotal}`,
//       image: '/assets/logo.png',

//       prefill: {
//         name: user?.name || '',
//         email: user?.email || '',
//         contact: user?.phone || ''
//       },

//       handler: (response: any) => {
//         // STEP 3: Razorpay payment successful
//         // Now verify on backend
//         this.verifyPayment(response);
//       },

//       model: {
//         ondismiss: () => {
//           this.errorMessage = 'Payment cancelled bu user';
//         }
//       },

//       theme: {
//         color: '#3399cc'
//       }
//     };


//     try {
//       const rzp = new Razorpay(options);
//       rzp.open();
//     } catch (error) {
//       this.errorMessage = 'Failed to open payment gateway';
//     }
//   }


//   // step 3: Verify payment on Backend using jQuery AJAX
//   verifyPayment(paymentResponse: any): void {
//     this.isProcessing = true;
//     this.errorMessage = '';

//     const verifyData = {
//       razorpay_order_id: paymentResponse.razorpay_order_id,
//       razorpay_payment_id: paymentResponse.razorpay_payment_id,
//       razorpay_signature: paymentResponse.razorpay_signature
//     }

//     const apiUrl = '/api/payment/verify-payment';  // yur backend endpoint

//     // jQuery AJAX Call for paymnet verification
//     $.ajax({
//       url: apiUrl,
//       type: 'POST',   // HTTP METHOD
//       dataType: 'json',
//       contentType: 'application/json',    // send as JSON
//       data: JSON.stringify(verifyData),   // Convert object to JSON string

//       success: (response: any) => {
//         console.log('Payment verification response:', response);

//         if (response.success && response.verified) {
//           this.successMessage = 'Payment successful! Order created.';
//           this.isProcessing = false;

//           // close dialog after 2 second
//           setTimeout(() => {
//             this.dialogRef.close({
//               success: true,
//               orderId: response.data?.orderId
//             });
//           }, 2000)
//         } else {
//           this.errorMessage = response.message || 'Payment verification failed';
//           this.isProcessing = false;
//         }
//       },

//       error: (xhr: any, status: any, error: any) => {
//         console.error('Error verifying payment:', error);
//         console.error('Status Code:', xhr.status);
//         console.error('Response:', xhr.responseText);

//         this.errorMessage = xhr.responseJSON?.message || 'Error verifying payment';
//         this.isProcessing = false
//       }
//     });
//   }

//   closeDailog(): void {
//     this.dialogRef.close({ success: false });
//   }
// }
