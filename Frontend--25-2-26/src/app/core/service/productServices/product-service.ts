import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  constructor(private http: HttpClient) { }


  //get all products
  getProducts() {
    const url = "http://localhost:3000/api/admin/product/getAll"
    return this.http.get(url, {})
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
    return this.http.post(url, ImageUpload, { withCredentials: true }
    );
  }


  // update products
  updateProducts(name: string, id: string) {
    const url = `http://localhost:3000/api/admin/product/${id}`
    return this.http.put(url, { name })
  }

  // delete Products
  deleteProducts(id: string) {
    const url = `http://localhost:3000/api/admin/product/${id}`
    return this.http.delete(url)
  }

    bulkCreateProducts(products: any[]) {
      const url = `http://localhost:3000/api/admin/products/bulk`
      return this.http.post(url,{products});
    }
  }
