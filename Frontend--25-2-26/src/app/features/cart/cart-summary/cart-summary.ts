import { Component, EventEmitter, OnInit, OnDestroy, Output } from '@angular/core';
import { Cart, CartItem, CartService } from '../../../core/service/cartService/cart-service';
import { AuthService } from '../../../core/service/authService/auth-service';
import { ProductService } from '../../../core/service/productServices/product-service';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PaymentConfig, PaymentService } from '../../../core/service/paymentService/payment-service';
import { Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-cart-summary',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './cart-summary.html',
  styleUrl: './cart-summary.css',
})
export class CartSummary implements OnInit, OnDestroy {
  cart: Cart | null = null;
  cartCount: number = 0;
  isAuthenticated: boolean = false;
  loading: boolean = false;
  paymentLoading: boolean = false;
  paymentSuccess: boolean = false;
  paymentError: string = '';
  userEmail: string = '';
  userName: string = '';
  userPhone: string = '';

  @Output() onContinue = new EventEmitter<void>();
  private destroy$ = new Subject<void>();
  private sub = new Subscription();

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private productService: ProductService,
    private paymentService: PaymentService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // 🛡️ REQUISITE: Subscribe to the auth status to handle page refreshes accurately.
    // Instead of checking once, we react whenever the session check (loadMe) completes.
    this.sub.add(
      this.authService.$me.subscribe(user => {
        this.isAuthenticated = !!user;
        console.log("CartSummary Auth Status Updated:", this.isAuthenticated);

        this.getUserDetails();
        this.loadCart();
      })
    );

    this.sub.add(
      this.cartService.cart$.subscribe((cart: Cart | null) => {
        this.cart = cart;
      })
    );

    this.sub.add(
      this.cartService.cartCount$.subscribe((count: number) => {
        this.cartCount = count;
      })
    );

    // Subscribe to cart changes (when items are added, removed, updated)
    this.sub.add(
      this.cartService.onCartChange().subscribe(() => {
        console.log('Cart changed, reloading cart...');
        this.loadCart();
      })
    );

    // Subscribe to product changes (when admin updates product prices, discounts, etc.)
    this.sub.add(
      this.productService.onProductsChange().subscribe(() => {
        console.log('Products changed, refreshing cart...');
        this.loadCart();
      })
    );

    // Subscribe to payment status updates
    this.sub.add(
      this.paymentService.getPaymentSuccess().subscribe((response) => {
        this.handlePaymentSuccess(response);
      })
    );

    this.sub.add(
      this.paymentService.getPaymentError().subscribe((error) => {
        this.handlePaymentError(error);
      })
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.sub.unsubscribe();
  }


  loadCart(event?: any): void {
    if (event) event.preventDefault();
    this.loading = true;

    if (!this.isAuthenticated) {
      // Guest: read from localStorage
      const items = this.cartService.getLocalCartItems();
      // console.log("-----1",items);
      this.cart = {
        _id: 'local',
        userId: 'guest',
        items,
        totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
        totalPrice: items.reduce((s, i) => s + i.price * i.quantity, 0),
        totalDiscount: items.reduce((s, i) => s + (i.discount || 0) * i.quantity, 0),
      };
      // console.log("----2",this.cart);
      this.loading = false;
      return;
    }

    this.cartService.getCart(true).subscribe({
      next: (response: any) => {
        if (response.data) {
          this.cartService.updateCartItems(response.data);
          this.cart = response.data;
          console.log(this.cart);
        } else {
          this.cart = null;
          // console.log(this.cart);
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.log('Error loading cart', error);
        this.loading = false;
      }
    });
  }

  removeItem(productId: string): void {
    this.cartService.removeFromCart(productId, this.isAuthenticated).subscribe({
      next: () => {
        this.loadCart();
      },
      error: (error: any) => {
        console.error('Error removing item:', error);
      }
    })
  }

  updateQuantity(productId: string, quantity: number | string): void {
    const qty = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity;

    if (qty <= 0) {
      this.removeItem(productId);
      return;
    }

    this.cartService.updateCartItemsItem(productId, qty, this.isAuthenticated).subscribe({
      next: () => {
        this.loadCart();
      },
      error: (error: any) => {
        console.error('Error updating cart:', error);
      }
    });
  }

  clearCart(): void {
    if (confirm('Are you sure you want to clear your cart?')) {
      this.cartService.clearCart(this.isAuthenticated).subscribe({
        next: () => {
          this.loadCart();
        },
        error: (error: any) => {
          console.error('Error clearing cart:', error);
        }
      })
    }
  }

  getProductId(item: CartItem): string {
    if (typeof item.productId === 'object' && item.productId) {
      return (item.productId as any)._id || (item.productId as any).id;
    }
    return item.productId;
  }

  getProductName(item: CartItem): string {
    if (typeof item.productId === 'object' && item.productId && 'name' in item.productId) {
      return (item.productId as any).name;
    }
    return item.product?.name || 'Product';
  }

  getProductImage(item: CartItem): string | null {
    if (typeof item.productId === 'object' && item.productId) {
      const productRef = item.productId as any;
      return productRef.imageUrl || productRef.image || null;
    }

    if (item.product) {
      const productRef = item.product as any;
      return productRef.imageUrl || productRef.image || null;
    }

    return null;
  }

  getDiscountedPrice(item: any): number {
    return item.price - (item.discount || 0);
  }

  getItemTotal(item: any): number {
    return this.getDiscountedPrice(item) * item.quantity;
  }

  // NEW: Missing method
  getCartTotal(): number {
    if (!this.cart || !this.cart.items || this.cart.items.length === 0) {
      return 0;
    }
    return (this.cart.totalPrice || 0) - (this.cart.totalDiscount || 0);
  }

  continueShopping(): void {
    this.onContinue.emit();
  }


  // get Authenticated user details
  private getUserDetails(): void {
    if (this.isAuthenticated) {
      this.authService.$me.subscribe(user => {
        if (user) {
          this.userName = user.name || '';
          this.userEmail = user.email || '';
          // Note: Add phone if available in MeResponse
        }
      });
    }
  }


  // Main checkout handler
  async onCheckout(): Promise<void> {
    this.paymentError = '';
    this.paymentSuccess = false;

    // Validate cart
    if (!this.cart || !this.cart.items || this.cart.items.length === 0) {
      return;
    }

    // Validate user details for Payment
    if (!this.userEmail || !this.userName) {
      this.paymentError = 'Please log in and complete your profile (name and email) before checkout.';
      return;
    }
    try {
      this.paymentLoading = true;

      // step 1 = load razorpay script
      await this.paymentService.loadRazorpayScript();

      // step 2 = calculate total in paise (1 INR = 100 paise)
      const totalInPaise = Math.round(this.getCartTotal() * 100);

      if (totalInPaise <= 0) {
        this.paymentError = 'Invalid cart total. Please review your cart.';
        this.paymentLoading = false;
        return;
      }

      // step 3 = create order on backend
      this.paymentService.createOrder(totalInPaise, {
        cartId: this.cart._id,
        userId: this.cart.userId,
        itemCount: this.cart.items.length
      }).subscribe({
        next: (createOrderResponse) => {
          if (createOrderResponse.success && createOrderResponse.data) {
            const orderData = createOrderResponse.data;

            // step 4 = Prepare payment Configuration
            const paymentConfig: PaymentConfig = {
              amount: orderData.amount,
              currency: orderData.currency,
              userEmail: this.userEmail,
              userName: this.userName,
              userPhone: this.userPhone,
              description: `Order #${orderData.orderId}`,
              notes: {
                cartId: this.cart?._id,
                itemCount: this.cart?.items.length,
                totalDiscount: this.cart?.totalDiscount
              }
            };

            // step 5 = open Razorpay checkout
            this.paymentService.openCheckout(
              paymentConfig,
              orderData.razorpayOrderId,
              orderData.key
            );

            this.paymentLoading = false;
          } else {
            this.paymentError = 'Failed to create order. Please try again.';
            this.paymentLoading = false;
          }
        },
        error: (error) => {
          console.error('Error creating order:', error);
          this.paymentError = 'Failed to create order. Please try again.';
          this.paymentLoading = false;
        }
      });
    } catch (error) {
      console.error('Checkout error:', error);
      this.paymentError = 'Failed to initialize payment gateway. Please try again.';
      this.paymentLoading = false;
    }
  }


  // Handle successful payment

  private handlePaymentSuccess(response: any): void {
    this.paymentLoading = false;
    if (response.success && response.verified) {
      this.paymentSuccess = true;
      this.paymentError = '';

      // Clear cart items in the UI immediately
      this.cart = null;

      // show success message for 2 seconds
      setTimeout(() => {
        this.cartService.clearCart(this.isAuthenticated).subscribe({
          next: () => {
            this.router.navigate(['/home-success'], {
              queryParams: {
                orderId: response.data?.orderId,
                paymentId: response.data?.payment
              }
            });
          },
          error: (error) => {
            console.error('Error clearing cart:', error);
            // Still redirect even if cart clear fails
            this.router.navigate(['/home-success'], {
              queryParams: {
                orderId: response.data?.orderId
              }
            });
          }
        });
      }, 2000);
    } else {
      this.paymentError = response.message || 'Payment verification failed.';
    }
  }

  // Handle payment error
  private handlePaymentError(error: string): void {
    this.paymentLoading = false;
    this.paymentError = error;
    this.paymentSuccess = false;
  }
}