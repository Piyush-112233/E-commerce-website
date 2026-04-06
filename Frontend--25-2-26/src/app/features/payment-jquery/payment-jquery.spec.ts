import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentJQuery } from './payment-jquery';

describe('PaymentJQuery', () => {
  let component: PaymentJQuery;
  let fixture: ComponentFixture<PaymentJQuery>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentJQuery]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentJQuery);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
