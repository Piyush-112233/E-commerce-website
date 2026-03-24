import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CategoryServices {
  constructor(private http: HttpClient) { }

  // get all categories
  getCategories() {
    const url = "http://localhost:3000/api/admin/category/getAll"
    return this.http.get(url, {});
  }

  // Create category
  createCategory(name: string) {
    const url = "http://localhost:3000/api/admin/category"
    return this.http.post(url, { name }, { withCredentials: true });
  }

  updateCategory(name: string, id: string) {
    const url = `http://localhost:3000/api/admin/category/${id}`
    return this.http.put(url, { name });
  }

  deleteCategory(id: string) {
    const url = `http://localhost:3000/api/admin/category/${id}`
    // console.log(url)
    return this.http.delete(url);
  }
}