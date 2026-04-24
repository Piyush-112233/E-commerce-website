import { AsyncPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { map, Observable, startWith, Subscription } from 'rxjs';
import { AuthService, MeResponse } from '../../../core/service/authService/auth-service';
import { CartService } from '../../../core/service/cartService/cart-service';
import { ChatSocketService } from '../../../features/chat/services/chat-socket.service';

@Component({
  selector: 'app-navbar',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit, OnDestroy {

  isLoggedIn$: Observable<boolean>;

  @Input() activeDrawer: 'products' | 'cart' | 'ai-chat' = 'products';
  @Output() drawerChange = new EventEmitter<'products' | 'cart' | 'ai-chat'>();

  // Cart count badge
  cartCount = 0;

  // Current user info
  currentUser: MeResponse | null = null;

  notifications: any[] = [];
  showDropdown = false;

  private sub = new Subscription();

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private socketService: ChatSocketService,
    private cdr: ChangeDetectorRef
  ) {
    this.isLoggedIn$ = this.authService.$me.pipe(
      map((me) => !!me),
      startWith(false)
    );
  }

  ngOnInit() {

    // !. Load saved notifications from localStorage
    const savedNotifs = localStorage.getItem('notifications');
    if (savedNotifs) {
      try {
        this.notifications = JSON.parse(savedNotifs);
      } catch (error) {
        this.notifications = [];
      }
    }

    // 👇 Listen for incoming notifications
    this.socketService.onNewNotification().subscribe((notif) => {

      console.log("🔔 FRONTEND RECEIVED NOTIFICATION:", notif);

      this.notifications.unshift(notif);  // Add new notification to the top of the array

      // 2. Save the newly updated array back to localStorage
      localStorage.setItem('notifications', JSON.stringify(this.notifications));

      this.cdr.detectChanges();  //  FORCE ANGULAR TO UPDATE THE RED BADGE!
    })


    // Current user
    this.sub.add(
      this.authService.$me.subscribe(me => {
        this.currentUser = me;

        // If user is authenticated, load the server cart
        if (me) {
          this.cartService.getCart(true).subscribe({
            next: (res: any) => {
              if (res?.data) {
                this.cartService.updateCartItems(res.data);
              }
            },
            error: () => { } // silent fail
          });
        }
      })
    );


    // Cart count - updates whenever items are added
    this.sub.add(
      this.cartService.cartCount$.subscribe(count => {
        this.cartCount = count;
      })
    );
  }

  clearNotifications() {
    this.notifications = [];
    localStorage.removeItem('notifications');
    this.showDropdown = false;
  }


  openDrawer(drawer: 'products' | 'cart' | 'ai-chat') {
    this.drawerChange.emit(drawer);

    // Refresh cart data whenever opening the cart drawer
    if (drawer === 'cart' && this.currentUser) {
      this.cartService.getCart(true).subscribe({
        next: (res: any) => {
          if (res?.data) {
            this.cartService.updateCartItems(res.data);
          }
        }
      });
    }
    // No extra logic needed for 'ai-chat' drawer
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
    // if(this.showDropdown) this.notifications = [];
  }

  logout() {
    this.authService.logout().subscribe({
      error: () => { },
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}