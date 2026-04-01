import { AddToCartDirective } from './add-to-cart-directive';
import { ElementRef } from '@angular/core';
import { of } from 'rxjs';

describe('AddToCartDirective', () => {
  it('should create an instance', () => {
    //------------------ add this code
    const mockCartService: any = { addToCart: () => of({}) };
    const mockAuthService: any = { isAuthenticated: () => false };
    const mockElementRef = { nativeElement: { style: {} } } as ElementRef;
    //-------------------------

    const directive = new AddToCartDirective(mockCartService, mockAuthService, mockElementRef);
    expect(directive).toBeTruthy();
  });
});
