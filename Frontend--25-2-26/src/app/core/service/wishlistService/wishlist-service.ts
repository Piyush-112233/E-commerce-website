import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WishlistService {
  private apiUrl = 'http://localhost:3000/api';
  private localStoragekey = 'localWishlist';

  private wishlistSubject = new BehaviorSubject<any>(null);
  public wishlist$ = this.wishlistSubject.asObservable();

  constructor(private http: HttpClient) { }

  // Local storage helpers
  private getLocalWishlist(): string[] {
    const wishlist = localStorage.getItem(this.localStoragekey);
    return wishlist ? JSON.parse(wishlist) : [];
  }

  private saveLocalWishlist(wishlist: string[]): void {
    localStorage.setItem(this.localStoragekey, JSON.stringify(wishlist));
  }

  // ADD to Wishlist
  addToWishlist(productId: string, isAuthenticated: boolean): Observable<any> {
    if (isAuthenticated) {
      return this.http.post(`${this.apiUrl}/add`, { productId });
    } else {
      const localWishlist = this.getLocalWishlist();
      if (localWishlist.includes(productId)) {
        localWishlist.push(productId);
        this.saveLocalWishlist(localWishlist);
      }
      return new Observable(observer => {
        observer.next({ success: true });
        observer.complete();
      });
    }
  }


  // GET Wishlist
  getWishlist(isAuthenticated: boolean): Observable<any> {
    if (isAuthenticated) {
      return this.http.get(`${this.apiUrl}/get`);
    } else {
      return new Observable(observer => {
        observer.next({ data: { products: this.getLocalWishlist() } });
        observer.complete();
      });
    }
  }


  // Remove from Wishlist
  removeFromWishList(productId: string, isAuthenticated: boolean) {
    if (isAuthenticated) {
      return this.http.delete(`${this.apiUrl}/remove`, {
        body: { productId }
      });
    } else {
      let localWishlist = this.getLocalWishlist();
      localWishlist = localWishlist.filter(id => id !== productId);
      this.saveLocalWishlist(localWishlist);
      return new Observable(observer => {
        observer.next({ success: true });
        observer.complete();
      });
    }
  }


  // Check if product is in wishlist
  isInWishlist(productId: string, isAuthenticated: boolean) {
    if (isAuthenticated) {
      // Check in database (you would implement this)
      return false;
    }
    return this.getLocalWishlist().includes(productId);
  }
}
