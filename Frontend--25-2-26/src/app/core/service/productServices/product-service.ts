import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { publicApiContext } from '../../http/auth-http-context';
import { CartService } from '../cartService/cart-service';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private productsRefresh$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private cartService: CartService
  ) { }

  // Observable that components can subscribe to for product updates
  onProductsChange() {
    return this.productsRefresh$.asObservable();
  }

  notifyProductsChanged() {
    this.productsRefresh$.next();
    // Also notify cart service in case product prices/discounts changed
    this.cartService.notifyCartChanged();
  }

  //get all products
  getProducts() {
    const url = "http://localhost:3000/api/admin/product/getAll"
    return this.http.get(url, { context: publicApiContext() })
  }

  getCategories() {
    const url = "http://localhost:3000/api/admin/category/getAll"
    return this.http.get(url, {})
  }

  //get by Id
  getProductsById(id: string) {
    const url = `http://localhost:3000/api/admin/product/getById/${id}`
    return this.http.get(url, {})
  }


  // Create Products
  createProducts(productData: any, files: File[]) {
    const ImageUpload = new FormData();
    ImageUpload.append("productData", JSON.stringify(productData));

    for (const f of files) ImageUpload.append("images", f);

    const url = "http://localhost:3000/api/admin/product"
    return this.http.post(url, ImageUpload, { withCredentials: true }).pipe(
      // Tap into the response and notify
      // tap(() => this.notifyProductsChanged())
    );
  }


  // update products
  updateProducts(productData: any, id: string) {
    const url = `http://localhost:3000/api/admin/product/${id}`
    return this.http.put(url, productData);
  }

  // delete Products
  deleteProducts(id: string) {
    const url = `http://localhost:3000/api/admin/product/${id}`
    return this.http.delete(url);
  }


  bulkCreateProducts(products: any[]) {
    const url = `http://localhost:3000/api/admin/products/bulk`
    return this.http.post(url, { products });
  }
}
