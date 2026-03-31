import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  discount?: number;
  product?: any;
}

export interface Cart {
  _id: string;
  userId: string;
  items: CartItem[];
  totalQuantity: number;
  totalPrice: number;
  totalDiscount: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private apiUrl = 'http://localhost:3000/api';
  private localStorageKey = 'localCart';

  cartSubject = new BehaviorSubject<Cart | null>(null);
  cart$ = this.cartSubject.asObservable();

  cartCountSubject = new BehaviorSubject<number>(0);
  cartCount$ = this.cartCountSubject.asObservable();


  constructor(private http: HttpClient) {
    const localCart = this.getLocalCart();
    if (localCart && localCart.length > 0) {
      this.cartCountSubject.next(localCart.reduce((sum, item) => sum + item.quantity, 0));
    }
  }

  // Get local cart from localStorage helper
  private getLocalCart(): CartItem[] {
    const cart = localStorage.getItem(this.localStorageKey);
    return cart ? JSON.parse(cart) : [];
  }

  // Save local cart to localStorage helper
  private saveLocalCart(items: CartItem[]): void {
    localStorage.setItem(this.localStorageKey, JSON.stringify(items));
  }

  // Update cart count
  private updateCartCount(): void {
    const localCart = this.getLocalCart();
    const totalQuantity = localCart.reduce((sum, item) => sum + item.quantity, 0);
    this.cartCountSubject.next(totalQuantity);
  }

  // get cart count
  getCartCount(): Observable<number> {
    return this.cartCountSubject.asObservable();
  }

  // Set cart
  updateCart(cart: Cart): void {
    this.cartSubject.next(cart);
    if (cart && cart.items) {
      this.cartCountSubject.next(cart.totalQuantity);
    }
  }





  // Add to cart (handles both authenticated and non-authenticated users)
  addToCart(productId: string, quantity: number = 1, isAuthenticated: boolean): Observable<any> {
    if (isAuthenticated) {
      return this.http.post(`${this.apiUrl}/add`, { productId, quantity });
    } else {
      // For non-authenticated users, use local storage
      const localCart = this.getLocalCart();
      const existingItem = localCart.find(item => item.productId === productId);

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        localCart.push({ productId, quantity, price: 0, discount: 0 });
      }
      this.saveLocalCart(localCart);
      this.updateCartCount();
      return new Observable(observer => {
        observer.next({ success: true, message: 'Added to cart (local)' });
        observer.complete();
      });
    }
  }

  // Get Cart
  getCart(isAuthenticated: boolean): Observable<any> {
    if (isAuthenticated) {
      return this.http.get(`${this.apiUrl}/get`);
    } else {
      return new Observable(observer => {
        observer.next({ data: { items: this.getLocalCart } });
        observer.complete();
      })
    }
  }


  // Update cart item
  updateCartItem(productId: string, quantity: number, isAuthenticated: boolean): Observable<any> {
    if (isAuthenticated) {
      return this.http.put(`${this.apiUrl}/update`, { productId, quantity });
    } else {
      const localCart = this.getLocalCart();
      const item = localCart.find(i => i.productId === productId);
      if (item) {
        item.quantity = quantity;
        if (quantity <= 0) {
          this.removeFromCart(productId, false);
        } else {
          this.saveLocalCart(localCart);
          this.updateCartCount();
        }
      }
      return new Observable(observer => {
        observer.next({ success: true });
        observer.complete();
      });
    }
  }


  // remove from cart
  removeFromCart(productId: string, isAuthenticated: boolean): Observable<any> {
    if (isAuthenticated) {
      return this.http.delete(`${this.apiUrl}/remove`, { body: productId })
    } else {
      let localCart = this.getLocalCart();
      localCart = localCart.filter(item => item.productId !== productId);
      this.saveLocalCart(localCart);
      this.updateCartCount();
      return new Observable(observer => {
        observer.next({ success: true });
        observer.complete();
      });
    }
  }


  // clear cart
  clearCart(isAuthenticated: boolean): Observable<any> {
    if (isAuthenticated) {
      return this.http.delete(`${this.apiUrl}/clear`);
    } else {
      this.saveLocalCart([]);
      this.updateCartCount();
      return new Observable(observer => {
        observer.next({ success: true });
        observer.complete();
      });
    }
  }


  // sync local cart to dataBase when user logs in
  sync(isAuthenticated: boolean): Observable<any> {
    if (isAuthenticated) {
      const localCart = this.getLocalCart();
      if (localCart.length > 0) {
        return this.http.post(`${this.apiUrl}/sync`, { localCart });
      }
    }
    return new Observable(observer => {
      observer.next({ success: true });
      observer.complete();
    });
  }
}
