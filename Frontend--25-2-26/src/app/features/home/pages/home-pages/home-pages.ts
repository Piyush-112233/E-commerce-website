import { Component, OnDestroy, OnInit } from '@angular/core';
import { ChatPageComponent } from '../../../chat/pages/chat-page-component/chat-page-component';
import { CommonModule } from '@angular/common';
import { ChatFacadeService } from '../../../chat/services/chat-facade.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home-pages',
  imports: [ChatPageComponent, CommonModule],
  templateUrl: './home-pages.html',
  styleUrl: './home-pages.css',
})
export class HomePages implements OnInit, OnDestroy {
  isChatOpen: boolean = false;
  hasOpenedChat: boolean = false;
  unreadCount: number = 0;
  private sub = new Subscription();

  constructor(private chatFacade: ChatFacadeService) { }


  ngOnInit() {
    this.sub.add(
      this.chatFacade.unreadCount$.subscribe(count => {
        this.unreadCount = count;
        // If chat is open while a message arrives, instantly mark it as read
        if (this.isChatOpen && this.unreadCount > 0) {
          this.chatFacade.markAsRead();
        }
      })
    );
  }

  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen) {
      this.hasOpenedChat = true;      // for network call are made when hit then widget icon of chat
      if (this.unreadCount > 0) {
        this.chatFacade.markAsRead();
      }
    }
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
