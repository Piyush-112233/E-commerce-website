import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductCart } from './product-cart';

describe('ProductCart', () => {
  let component: ProductCart;
  let fixture: ComponentFixture<ProductCart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductCart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
