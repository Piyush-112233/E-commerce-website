import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Cart, CartItem, CartService } from '../../../core/service/cartService/cart-service';
import { AuthService } from '../../../core/service/authService/auth-service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cart-summary',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './cart-summary.html',
  styleUrl: './cart-summary.css',
})
export class CartSummary implements OnInit {
  cart: Cart | null = null;
  cartCount: number = 0;
  isAuthenticated: boolean = false;
  loading: boolean = false;
  @Output() onContinue = new EventEmitter<void>();

  constructor(
    private cartService: CartService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isAuthenticated();

    this.cartService.cart$.subscribe((cart: Cart | null) => {
      this.cart = cart;
    });

    this.cartService.cartCount$.subscribe((count: number) => {
      this.cartCount = count;
    });

    this.loadCart();
  }


  loadCart(event?: any): void {
    if (event) event.preventDefault();
    this.loading = true;

    if (!this.isAuthenticated) {
      // Guest: read from localStorage
      const items = this.cartService.getLocalCartItems();
      this.cart = {
        _id: 'local',
        userId: 'guest',
        items,
        totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
        totalPrice: items.reduce((s, i) => s + i.price * i.quantity, 0),
        totalDiscount: items.reduce((s, i) => s + (i.discount || 0) * i.quantity, 0),
      };
      this.loading = false;
      return;
    }

    this.cartService.getCart(true).subscribe({
      next: (response: any) => {
        if (response.data) {
          this.cartService.updateCart(response.data);
          this.cart = response.data;
        } else {
          this.cart = null;
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

    this.cartService.updateCartItem(productId, qty, this.isAuthenticated).subscribe({
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
}