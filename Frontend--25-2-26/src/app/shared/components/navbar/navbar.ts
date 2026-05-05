import { AsyncPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { map, Observable, startWith, Subscription } from 'rxjs';
import { AuthService, MeResponse } from '../../../core/service/authService/auth-service';
import { CartService } from '../../../core/service/cartService/cart-service';
import { ChatSocketService } from '../../../features/chat/services/chat-socket.service';
import { NotificationBellComponent } from '../../../features/notification-bell/notification-bell.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [AsyncPipe, RouterLink, NotificationBellComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit, OnDestroy {

  isLoggedIn$: Observable<boolean>;

  @Input() activeDrawer: 'products' | 'cart' | 'ai-chat' = 'products';
  @Output() drawerChange = new EventEmitter<'products' | 'cart' | 'ai-chat'>();

  cartCount = 0;
  currentUser: MeResponse | null = null;

  private sub = new Subscription();

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private socketService: ChatSocketService,
  ) {
    this.isLoggedIn$ = this.authService.$me.pipe(
      map((me) => !!me),
      startWith(false)
    );
  }

  ngOnInit() {
    // Ensure socket is connected (needed for real-time notification events)
    this.socketService.connect();

    // Current user
    this.sub.add(
      this.authService.$me.subscribe(me => {
        this.currentUser = me;
        if (me) {
          this.cartService.getCart(true).subscribe({
            next: (res: any) => {
              if (res?.data) this.cartService.updateCartItems(res.data);
            },
            error: () => {}
          });
        }
      })
    );

    // Cart count badge
    this.sub.add(
      this.cartService.cartCount$.subscribe(count => {
        this.cartCount = count;
      })
    );
  }

  openDrawer(drawer: 'products' | 'cart' | 'ai-chat') {
    this.drawerChange.emit(drawer);
    if (drawer === 'cart' && this.currentUser) {
      this.cartService.getCart(true).subscribe({
        next: (res: any) => {
          if (res?.data) this.cartService.updateCartItems(res.data);
        }
      });
    }
  }

  logout() {
    this.authService.logout().subscribe({ error: () => {} });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}