import { Component, Input, OnInit } from '@angular/core';
import { AuthService } from '../../../core/service/authService/auth-service';
import { WishlistService } from '../../../core/service/wishlistService/wishlist-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AddToCartDirective } from '../directive/add-to-cart-directive';

@Component({
  selector: 'app-product-cart',
  imports: [CommonModule, FormsModule, AddToCartDirective],
  templateUrl: './product-cart.html',
  styleUrl: './product-cart.css',
})
export class ProductCart implements OnInit {
  @Input() product: any;

  constructor(
    private authService: AuthService,
    private wishlistService: WishlistService
  ) { }

  quantity: number = 1;
  isWishlisted: boolean = false;
  isAuthenticated: boolean = false;

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
  }

  toggleWishlist(): void {
    if (!this.isWishlisted) {
      this.wishlistService.addToWishlist(this.product._id, this.isAuthenticated)
        .subscribe({
          next: () => {
            this.isWishlisted = true;
          },
          error: (error: any) => {
            console.error('Error adding to wishlist:', error);
          }
        });
    } else {
      this.wishlistService.removeFromWishList(this.product._id, this.isAuthenticated)
        .subscribe({
          next: () => {
            this.isWishlisted = false;
          },
          error: (error: any) => {
            console.error('Error removing from wishlist:', error);
          }
        });
    }
  }

  getDiscountedPrice(): number {
    return this.product.price - (this.product.discount || 0);
  }

  getDiscountPercentage(): string {
    return ((this.product.discount || 0) / this.product.price * 100).toFixed(0);
  }
}
