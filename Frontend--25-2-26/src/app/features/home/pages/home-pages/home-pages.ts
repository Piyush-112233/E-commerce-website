import { Component, OnDestroy, OnInit } from '@angular/core';
import { map, Observable, startWith, Subscription } from 'rxjs';
import { ChatPageComponent } from '../../../chat/pages/chat-page-component/chat-page-component';
import { ChatFacadeService } from '../../../chat/services/chat-facade.service';
import { ProductCart } from '../../../cart/product-cart/product-cart';
import { CartSummary } from '../../../cart/cart-summary/cart-summary';
import { ProductService } from '../../../../core/service/productServices/product-service';
import { AuthService, MeResponse } from '../../../../core/service/authService/auth-service';
import { CartService } from '../../../../core/service/cartService/cart-service';
import { AiChatPage } from '../../../chat/pages/ai-chat-page/ai-chat-page';
// import { AsyncPipe } from '@angular/common';
// import { RouterLink } from '@angular/router';
import { Navbar } from '../../../../shared/components/navbar/navbar';

@Component({
  selector: 'app-home-pages',
  imports: [ChatPageComponent, ProductCart, CartSummary, AiChatPage, Navbar],
  templateUrl: './home-pages.html',
  styleUrl: './home-pages.css',
})
export class HomePages implements OnInit, OnDestroy {



  // Data
  categories: any[] = [];
  products: any[] = [];
  selectedCategoryId: string | null = null;
  loadingCategories = false;
  loadingProducts = false;
  error: string | null = null;


  // Skeleton loading placeholders
  skeletons = Array(6).fill(null);




  // Drawer state
  activeDrawer: 'products' | 'cart' | 'ai-chat' = 'products';
  cartCount = 0;

  // Chat
  isChatOpen = false;
  hasOpenedChat = false;
  unreadCount = 0;

  private sub = new Subscription();

  constructor(
    private chatFacade: ChatFacadeService,
    private productService: ProductService,
    private cartService: CartService
  ) { }

  ngOnInit() {
    // Unread chat count
    this.sub.add(
      this.chatFacade.unreadCount$.subscribe(count => {
        this.unreadCount = count;
        if (this.isChatOpen && this.unreadCount > 0) {
          this.chatFacade.markAsRead();
        }
      })
    );

    this.sub.add(
      this.cartService.cartCount$.subscribe(count => {
        this.cartCount = count;
      })
    );

    this.fetchCategories();
    this.fetchProducts();
  }

  get filteredProducts(): any[] {
    if (!this.selectedCategoryId) return this.products;
    return this.products.filter(p => {
      const categoryId =
        typeof p?.categoryId === 'string' ? p.categoryId : (p?.categoryId?._id ?? p?.categoryId?.id);
      return categoryId === this.selectedCategoryId;
    });
  }

  selectCategory(id: string | null) {
    this.selectedCategoryId = id;
  }


  openDrawer(drawer: 'products' | 'cart' | 'ai-chat') {
    this.activeDrawer = drawer;
  }


  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen) {
      this.hasOpenedChat = true;
      if (this.unreadCount > 0) {
        this.chatFacade.markAsRead();
      }
    }
  }

  private fetchCategories() {
    this.loadingCategories = true;
    this.error = null;
    this.sub.add(
      this.productService.getCategories().subscribe({
        next: (_data: any) => {
          const categories = _data?.data?.categories ?? [];
          this.categories = Array.isArray(categories) ? categories : [];
          this.loadingCategories = false;
        },
        error: (err: any) => {
          console.error('Failed to load categories:', err);
          this.loadingCategories = false;
          this.error = 'Failed to load categories. Please try again.';
        },
      })
    );
  }

  private fetchProducts() {
    this.loadingProducts = true;
    this.error = null;
    this.sub.add(
      this.productService.getProducts().subscribe({
        next: (_data: any) => {
          const products = _data?.data?.productObj ?? [];
          this.products = Array.isArray(products)
            ? products.map((p: any) => ({
              ...p,
              price: typeof p?.price === 'number' ? p.price : Number(p?.price ?? 0),
              discount: typeof p?.discount === 'number' ? p.discount : Number(p?.discount ?? 0),
              description: p?.description ?? '',
            }))
            : [];
          this.loadingProducts = false;
        },
        error: (err: any) => {
          console.error('Failed to load products:', err);
          this.loadingProducts = false;
          this.error = 'Failed to load products. Please try again.';
        },
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
