import { Directive, ElementRef, HostListener, Input, input, OnInit } from '@angular/core';
import { CartService } from '../../../core/service/cartService/cart-service';
import { AuthService } from '../../../core/service/authService/auth-service';

@Directive({
  selector: '[appAddToCart]',
})
export class AddToCartDirective implements OnInit {
  @Input() appAddToCart: string = ''; // productId
  @Input() quantity: number = 1;


  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private el: ElementRef
  ) { }

  ngOnInit(): void {
    this.el.nativeElement.style.cursor = 'pointer';
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    event.preventDefault();

    if (!this.appAddToCart) {
      console.warn('Product ID is required');
      return;
    }

    const isAuthenticated = this.authService.isAuthenticated();

    this.cartService.addToCart(this.appAddToCart, this.quantity, isAuthenticated)
      .subscribe({
        next: (response: any) => {
          console.log('Added to cart:', response);
          this.showNotification('Product added to cart!');
          // Reset quantity after adding
        this.quantity = 1;
        },
        error: (error: any) => {
          console.error('Error adding to cart:', error);
          this.showNotification('Error adding to cart', 'error');
        }
      });
  }

  private showNotification(message: string, type: string = 'success'): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

}
