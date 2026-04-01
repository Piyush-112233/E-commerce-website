import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { HomePages } from './home-pages';
import { ChatFacadeService } from '../../../chat/services/chat-facade.service';
import { ProductService } from '../../../../core/service/productServices/product-service';

describe('HomePages', () => {
  let component: HomePages;
  let fixture: ComponentFixture<HomePages>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      //------------------------ add this code in 
      imports: [HomePages],
      providers: [
        {
          provide: ChatFacadeService,
          useValue: {
            unreadCount$: of(0),
            markAsRead: () => undefined,
          },
        },
        {
          provide: ProductService,
          useValue: {
            getCategories: () => of({ data: { categories: [] } }),
            getProducts: () => of({ data: { productObj: [] } }),
          },
        },
      ],
    })
    //----------------------------
    .compileComponents();

    fixture = TestBed.createComponent(HomePages);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
