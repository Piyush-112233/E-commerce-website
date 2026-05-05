import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, tap, Subject } from 'rxjs';

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

  private cartRefresh$ = new Subject<void>();


  constructor(private http: HttpClient) {
    const localCart = this.getLocalCart();
    if (localCart && localCart.length > 0) {
      this.cartCountSubject.next(localCart.reduce((sum, item) => sum + item.quantity, 0));
    }
  }

  // Observable that components can subscribe to for cart updates
  onCartChange() {
    return this.cartRefresh$.asObservable();
  }

  notifyCartChanged() {
    this.cartRefresh$.next();
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
    console.log("Checking Auth Status...", isAuthenticated);
    if (isAuthenticated) {
      return this.http.post(`${this.cartUrl}/add`, { productId, quantity }).pipe(
        tap((response: any) => {
          console.log('Add to cart response:', response);
          const cart = response?.data?.cart ?? response?.cart ?? response?.data;
          if (cart && Array.isArray(cart.items) && typeof cart.totalQuantity === 'number') {
            this.updateCartItems(cart);
          } else {
            // Fallback for APIs that don't return the full cart object.
            this.cartCountSubject.next(this.cartCountSubject.getValue() + quantity);
          }
          // Notify that cart has changed
          this.notifyCartChanged();
        })
      );
    } else {
      // For non-authenticated users, use local storage
      const localCart = this.getLocalCart();
      const existingItem = localCart.find(item => item.productId === productId);

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
      
      // Update cartSubject for display
      const items = this.getLocalCart();
      const updatedCart: Cart = {
        _id: 'local',
        userId: 'guest',
        items,
        totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
        totalPrice: items.reduce((s, i) => s + i.price * i.quantity, 0),
        totalDiscount: items.reduce((s, i) => s + (i.discount || 0) * i.quantity, 0),
      };
      this.cartSubject.next(updatedCart);
      
      // Notify that cart has changed
      this.notifyCartChanged();
      return of({ success: true, message: 'Added to cart (local)' });
    }
  }

  // Get Cart
  getCart(isAuthenticated: boolean): Observable<any> {
    if (isAuthenticated) {
      return this.http.get(`${this.cartUrl}/get`);
    } else {
      return of({ data: { items: this.getLocalCart() } });
    }
  }

  // Update cart item
  updateCartItemsItem(productId: string, quantity: number, isAuthenticated: boolean): Observable<any> {
    if (isAuthenticated) {
      return this.http.put(`${this.cartUrl}/update`, { productId, quantity }).pipe(
        tap((response: any) => {
          const cart = response?.data?.cart ?? response?.cart ?? response?.data;
          if (cart && Array.isArray(cart.items) && typeof cart.totalQuantity === 'number') {
            this.updateCartItems(cart);
          }
          this.notifyCartChanged();
        })
      );
    } else {
      const localCart = this.getLocalCart();
      const item = localCart.find(i => i.productId === productId);
      if (item) {
        item.quantity = quantity;
        if (quantity <= 0) {
          this.removeFromCart(productId, false);
        } else {
          this.saveLocalCart(localCart);
          this.updateCartItemsCount();
          
          // Update cartSubject for display
          const items = this.getLocalCart();
          const updatedCart: Cart = {
            _id: 'local',
            userId: 'guest',
            items,
            totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
            totalPrice: items.reduce((s, i) => s + i.price * i.quantity, 0),
            totalDiscount: items.reduce((s, i) => s + (i.discount || 0) * i.quantity, 0),
          };
          this.cartSubject.next(updatedCart);
          this.notifyCartChanged();
        }
      }
      return of({ success: true });
    }
  }

  // remove from cart
  removeFromCart(productId: string, isAuthenticated: boolean): Observable<any> {
    if (isAuthenticated) {
      return this.http.delete(`${this.cartUrl}/remove`, { body: { productId } }).pipe(
        tap((response: any) => {
          const cart = response?.data?.cart ?? response?.cart ?? response?.data;
          if (cart && Array.isArray(cart.items) && typeof cart.totalQuantity === 'number') {
            this.updateCartItems(cart);
          }
          this.notifyCartChanged();
        })
      );
    } else {
      let localCart = this.getLocalCart();
      localCart = localCart.filter(item => item.productId !== productId);
      this.saveLocalCart(localCart);
      this.updateCartItemsCount();
      
      // Update cartSubject for display
      const items = this.getLocalCart();
      const updatedCart: Cart = {
        _id: 'local',
        userId: 'guest',
        items,
        totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
        totalPrice: items.reduce((s, i) => s + i.price * i.quantity, 0),
        totalDiscount: items.reduce((s, i) => s + (i.discount || 0) * i.quantity, 0),
      };
      this.cartSubject.next(updatedCart);
      this.notifyCartChanged();
      return of({ success: true });
    }
  }

  // clear cart
  clearCart(isAuthenticated: boolean): Observable<any> {
    if (isAuthenticated) {
      return this.http.delete(`${this.cartUrl}/clear`).pipe(
        tap(() => {
          this.cartSubject.next(null);
          this.cartCountSubject.next(0);
          this.notifyCartChanged();
        })
      );
    } else {
      this.saveLocalCart([]);
      this.updateCartItemsCount();
      this.cartSubject.next(null);
      this.notifyCartChanged();
      return of({ success: true });
    }
  }


  // sync local cart to dataBase when user logs in
  sync(isAuthenticated: boolean): Observable<any> {
    if (isAuthenticated) {
      const localCart = this.getLocalCart();
      if (localCart.length > 0) {
        return this.http.post(`${this.cartUrl}/sync`, { localCart });
      }
    }
    return of({ success: true });
  }

  // Sync local cart to DB then clear local storage (call after login)
  syncAndClearLocal(): Observable<any> {
    const localCart = this.getLocalCart();
    if (localCart.length > 0) {
      return this.http.post(`${this.cartUrl}/sync`, { localCart }).pipe(
        tap((response: any) => {
          const cart = response?.data?.cart ?? response?.cart ?? response?.data;
          this.saveLocalCart([]);
          this.cartCountSubject.next(0);
          if (cart && Array.isArray(cart.items) && typeof cart.totalQuantity === 'number') {
            this.updateCartItems(cart);
          }
          this.notifyCartChanged();
        })
      );
    }
    return of({ success: true, message: 'No local cart to sync' });
  }

  // Get raw local cart items (for display when not authenticated)
  getLocalCartItems(): CartItem[] {
    return this.getLocalCart();
  }
}
