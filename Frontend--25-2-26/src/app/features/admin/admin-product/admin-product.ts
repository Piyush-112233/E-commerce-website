import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProductService } from '../../../core/service/productServices/product-service';
// import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator'
import { read, utils, writeFile } from "xlsx";
// import { SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-admin-product',
  imports: [ReactiveFormsModule, MatTableModule, MatPaginatorModule, FormsModule],
  templateUrl: './admin-product.html',
  styleUrl: './admin-product.css',
})

export class AdminProduct implements AfterViewInit {
  constructor(
    private productService: ProductService,
    private ProductDetail: FormBuilder,
  ) { }
  data: any[] = [];
  csvColumns: string[] = [];
  csvCategoryId: string | null = null;


  displayedColumns: string[] = [
    '#',
    'image',
    'name',
    'price',
    'categoryId',
    'actions'
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  products = new MatTableDataSource<any>();

  productForm!: FormGroup
  // products: any[] = []
  isEditMode = false
  selectedProductById: string | null = null

  categories: any[] = [];
  files: File[] = [];

  ngOnInit(): void {
    this.productForm = this.ProductDetail.group(
      {
        name: [''],
        price: [''],
        categoryId: [null],
        image: []
      }
    );
    console.log('Admin--Product Loaded')
    this.getProduct();
    this.getCategories();
  }

  ngAfterViewInit() {
    this.products.paginator = this.paginator;
  }


  getProduct() {
    this.productService.getProducts().subscribe({
      next: (_data: any) => {
        this.products.data = _data?.data?.productObj ?? [];
        // console.log(_data)

        if (this.paginator) this.products.paginator = this.paginator

      },
      error: (_error: any) => {
        console.log(_error.error)
      }
    })
  }

  getCategories() {
    this.productService.getCategories().subscribe({
      next: (_data: any) => {
        // console.log(_data.data.categories)
        this.categories = _data.data.categories || [];
      }
    })
  }

  getProdById(id: string) {
    this.productService.getProductsById(id).subscribe({
      next: (_data: any) => {
        this.getProduct();
        alert("Product Gotted")
      },
      error: (_error: any) => {
        alert("Not Found")
      }
    })
  }

  addProduct() {
    const value = this.productForm.value
    // console.log("FORM DATA:", value);
    if (!value.categoryId) {
      alert("Please select a category");
      return;
    }
    if (this.selectedProductById) {
      this.productService.updateProducts(value, this.selectedProductById).subscribe({
        next: (_data: any) => {
          this.getProduct();
          this.isEditMode = false
          alert("Product Update")
        },
        error: (_error: any) => {
          alert("Not Updated")
        }
      })
    } else {
      // console.log(value)
      this.productService.createProducts(value, this.files).subscribe({

        next: (_data: any) => {
          // console.log(_data.data.productObj)
          this.products.data = [...this.products.data, _data.data.productObj]
          this.productForm.reset();
          alert("Category Added")
        },
        error: (_error: any) => {
          alert("Product not found")
        }
      })
    }
  }

  editProduct(prod: any) {
    this.isEditMode = true
    this.selectedProductById = prod._id;

    this.productForm.patchValue({
      name: prod.name,
      price: prod.price,
      categoryId: prod.categoryId,
      image: prod.image
    });
  }


  deleteProduct(id: any) {
    this.productService.deleteProducts(id).subscribe({
      next: (_data: any) => {
        this.getProduct();
        alert("Product Deleted");
      },
      error: (_error: any) => {
        alert("Some Error");
      }
    })
  }

  onFiles(e: Event) {
    const input = e.target as HTMLInputElement;
    this.files = input.files ? Array.from(input.files) : [];
    console.log(this.files);
  }


  csvImport($event: any) {
    alert('CSV Import triggered');
    const files = $event.target.files;
    if (files.length) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {

        // read workbook
        const wb = read(event.target.result);

        // grab forst sheet
        const sheets = wb.SheetNames;

        // save data
        if (sheets.length) {
          const rows = utils.sheet_to_json(wb.Sheets[sheets[0]]);
          this.data = rows as any[];
          this.csvColumns = rows.length ? Object.keys(this.data[0]) : [];
          // console.log(this.data);
          // console.log(typeof this.data);
        }

      }
      reader.readAsArrayBuffer(file)
    }
  }

  csvExport() {
    // const headings = [['Id', 'Name', 'price', 'Category']];
    // generate workbook and add the worksheet

    // generate worksheet
    // utils.sheet_add_aoa(ws, headings);
    // utils.sheet_add_json(ws, this.data,
    //   {
    //     origin: 'A2',
    //     skipHeader: true
    //   }
    // );
    const rows = this.products?.data ?? [];
    
    if (!rows.length) {
      alert('No data to export');
      return;
    }

    const cleanRow = rows.map((p: any) => ({
      name: p.name,
      price: p.price,
      category: p.categoryId?.name || p.categoryId,
      image: p.imageUrl
    }))

    const ws: any = utils.json_to_sheet([cleanRow]);
    const wb = utils.book_new();

    utils.book_append_sheet(wb, ws, 'Products');
    writeFile(wb, 'Products_Report.xlsx');
  }


  importCsvToProducts() {
    if (!this.csvCategoryId) {
      alert("Please Select a Category for CSV")
    }

    const productsPayload = this.data.map((r: any) => ({
      name: (r.name ?? r.Name ?? '').toString().trim(),
      price: Number(r.price ?? r.Price ?? 0),
      categoryId: this.csvCategoryId       // apply dropdown category to all rows
    }));

    const invalid = productsPayload.filter(p => !p.name || !Number.isFinite(p.price || p.price <= 0));
    if (invalid.length) {
      alert(`Invalid rows: ${invalid.length}. Check name/price in CSV.`);
      return;
    }

    this.productService.bulkCreateProducts(productsPayload).subscribe({
      next: () => {
        alert('CSV imported Successfully')
        this.getProduct();
        this.data = [];
        this.csvColumns = [];
      },
      error: (err) => {
        console.error(err);
        // console.error('bulk error status:', err.status);
        // console.error('bulk error body:', err.error);
        alert('CSV import failed');
      }
    })
  }

}
