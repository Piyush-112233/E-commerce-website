import { Directive, ElementRef, HostListener, Input, OnInit } from '@angular/core';
import { CartService } from '../../../core/service/cartService/cart-service';
import { AuthService } from '../../../core/service/authService/auth-service';

@Directive({
  selector: '[appAddToCart]',
})
export class AddToCartDirective implements OnInit {
  @Input() appAddToCart: string = ''; // productId
  @Input() product: any = null; // full product object
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

    // Disable button briefly to prevent double-clicks
    const btn: HTMLButtonElement = this.el.nativeElement;
    btn.disabled = true;
    btn.textContent = 'Adding…';

    const isAuthenticated = this.authService.isAuthenticated();

    this.cartService.addToCart(this.appAddToCart, this.quantity, isAuthenticated, this.product).subscribe({
      next: (response: any) => {
        console.log('Added to cart:', response);
        this.showToast('✓ Added to cart!', 'success');
        btn.disabled = false;
        btn.textContent = 'Add to Cart';
        this.quantity = 1;
        
      },
      error: (error: any) => {
        console.error('Error adding to cart:', error);
        this.showToast('Error adding to cart', 'error');
        btn.disabled = false;
        btn.textContent = 'Add to Cart';
      }
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    // Remove any existing toast
    const existing = document.getElementById('atc-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'atc-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 90px;
      right: 24px;
      padding: 12px 20px;
      border-radius: 10px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      color: white;
      background: ${type === 'success' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#ef4444,#dc2626)'};
      box-shadow: 0 6px 20px rgba(0,0,0,0.2);
      z-index: 9999;
      animation: toastIn 0.3s ease forwards;
      pointer-events: none;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes toastIn {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
}
