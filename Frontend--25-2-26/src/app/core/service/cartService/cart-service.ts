import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';

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
  private cartUrl = `${this.apiUrl}/cart`;
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
  private updateCartItemsCount(): void {
    const localCart = this.getLocalCart();
    const totalQuantity = localCart.reduce((sum, item) => sum + item.quantity, 0);
    this.cartCountSubject.next(totalQuantity);
  }

  // get cart count
  getCartCount(): Observable<number> {
    return this.cartCountSubject.asObservable();
  }

  // Set cart
  updateCartItems(cart: Cart): void {
    this.cartSubject.next(cart);
    if (cart && cart.items) {
      this.cartCountSubject.next(cart.totalQuantity);
    }
  }





  // Add to cart (handles both authenticated and non-authenticated users)
  addToCart(productId: string, quantity: number = 1, isAuthenticated: boolean, product?: any): Observable<any> {
    // console.log("------1");
    if (isAuthenticated) {
      return this.http.post(`${this.cartUrl}/add`, { productId, quantity }).pipe(
        tap((response: any) => {
          const cart = response?.data?.cart ?? response?.cart ?? response?.data;
          if (cart && Array.isArray(cart.items) && typeof cart.totalQuantity === 'number') {
            this.updateCartItems(cart);
            return;
          }

          // Fallback for APIs that don't return the full cart object.
          this.cartCountSubject.next(this.cartCountSubject.getValue() + quantity);
        })
      );
    } else {
      // For non-authenticated users, use local storage
      const localCart = this.getLocalCart();
      // console.log("--------2", localCart);
      const existingItem = localCart.find(item => item.productId === productId);
      // console.log("------3", existingItem);

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        localCart.push({
          productId,
          quantity,
          price: product?.price || 0,
          discount: product?.discount || 0,
          product: product
        });
      }
      this.saveLocalCart(localCart);
      this.updateCartItemsCount();
      return new Observable(observer => {
        observer.next({ success: true, message: 'Added to cart (local)' });
        observer.complete();
      });
    }
  }

  // Get Cart
  getCart(isAuthenticated: boolean): Observable<any> {
    if (isAuthenticated) {
      return this.http.get(`${this.cartUrl}/get`);
    } else {
      return new Observable(observer => {
        observer.next({ data: { items: this.getLocalCart() } });
        observer.complete();
      })
    }
  }


  // Update cart item
  updateCartItemsItem(productId: string, quantity: number, isAuthenticated: boolean): Observable<any> {
    if (isAuthenticated) {
      return this.http.put(`${this.cartUrl}/update`, { productId, quantity });
    } else {
      const localCart = this.getLocalCart();
      // console.log("------4", localCart);
      const item = localCart.find(i => i.productId === productId);
      // console.log("------5", item);
      if (item) {
        item.quantity = quantity;
        if (quantity <= 0) {
          this.removeFromCart(productId, false);
        } else {
          this.saveLocalCart(localCart);
          this.updateCartItemsCount();
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
      return this.http.delete(`${this.cartUrl}/remove`, { body: { productId } })
    } else {
      let localCart = this.getLocalCart();
      // console.log("------6", localCart);
      localCart = localCart.filter(item => item.productId !== productId);
      this.saveLocalCart(localCart);
      this.updateCartItemsCount();
      return new Observable(observer => {
        observer.next({ success: true });
        observer.complete();
      });
    }
  }


  // clear cart
  clearCart(isAuthenticated: boolean): Observable<any> {
    if (isAuthenticated) {
      return this.http.delete(`${this.cartUrl}/clear`);
    } else {
      this.saveLocalCart([]);
      this.updateCartItemsCount();
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
      // console.log("------7", localCart);
      if (localCart.length > 0) {
        return this.http.post(`${this.cartUrl}/sync`, { localCart });
      }
    }
    return new Observable(observer => {
      observer.next({ success: true });
      observer.complete();
    });
  }

  // Sync local cart to DB then clear local storage (call after login)
  syncAndClearLocal(): Observable<any> {
    const localCart = this.getLocalCart();
    // console.log("------8");
    if (localCart.length > 0) {
      return new Observable(observer => {
        this.http.post(`${this.cartUrl}/sync`, { localCart }, { withCredentials: true }).subscribe({
          next: (res) => {
            this.saveLocalCart([]);
            this.cartCountSubject.next(0);
            observer.next(res);
            observer.complete();
          },
          error: (err) => {
            observer.error(err);
          }
        });
      });
    }
    return new Observable(observer => {
      observer.next({ success: true, message: 'No local cart to sync' });
      observer.complete();
    });
  }

  // Get raw local cart items (for display when not authenticated)
  getLocalCartItems(): CartItem[] {
    return this.getLocalCart();
  }
}
