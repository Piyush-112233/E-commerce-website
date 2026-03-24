import { Component } from '@angular/core';
import { CategoryServices } from '../../../core/service/categoryServices/category-services';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-category',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-category.html',
  styleUrl: './admin-category.css',
})
export class AdminCategory {
  constructor(
    private categoryService: CategoryServices,
    private CategoryDetail: FormBuilder
  ) { }
  categoryForm!: FormGroup
  categories: any[] = [];
  // update function by id
  selectedCategoryId: string | null = null

  ngOnInit(): void {
    this.categoryForm = this.CategoryDetail.group(
      {
        name: ['']
      }
    );
    console.log('Admin--Category Loaded')
    this.getCategory();
  }

  getCategory() {
    this.categoryService.getCategories().subscribe({
      next: (_data: any) => {
        // console.log(_data.data.categories);
        this.categories = _data.data.categories || [];
      }
    })
  }
  saveCategory() {

    // console.log("Submit function called")
    const value = this.categoryForm.value
    if (this.selectedCategoryId) {
      // console.log("Api should called")

      // Update
      this.categoryService.updateCategory(value?.name, this.selectedCategoryId).subscribe({
        next: (cat: any) => {
          // console.log("------2")
          this.getCategory();
          alert("Category Updated");
        },
        error: (cat: any) => {
          alert("Not updated")
        }
      })

    } else {

      // Create
      this.categoryService.createCategory(value?.name).subscribe({
        next: (_data: any) => {
          // console.log(_data.data.categoryObj)
          // console.log(this.categories)
          this.categories.push(_data.data.categoryObj);
          // this.getCategory();
          this.categoryForm.reset();
          alert("category added")
        },
        error: (_error: any) => {
          alert("Category not found")
        }
      })
    }
  }

  resetForm() {
    this.categoryForm.reset();
    this.selectedCategoryId = null;
  }

  editCategory(cat: any) {
    // const value = this.categoryForm.value
    // this.categoryService.updateCategory(value?.name, cat?.id).subscribe({
    //   next: (cat: any) => {
    //     alert("Category Updated");
    //   },
    //   error: (cat: any) => {
    //     alert("Not Updated")
    //   }
    // })

    this.selectedCategoryId = cat._id;
    this.categoryForm.patchValue({
      name: cat.name
    })
  }

  deleteCategory(id: string) {
    this.categoryService.deleteCategory(id).subscribe({
      next: (_data: any) => {
        this.getCategory()
        alert("category Deleted")
      },
      error: (_data: any) => {
        alert("Some error")
      }
    })
  }

}
