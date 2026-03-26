import { Component } from '@angular/core';
import { ChatMessage } from '../../types/chat.types';
import { Subscription } from 'rxjs';
import { ChatFacadeService } from '../../services/chat-facade.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-page-component',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-page-component.html',
  styleUrl: './chat-page-component.css',
})
export class ChatPageComponent {
  messageText = '';
  messages: ChatMessage[] = [];
  role = '';
  private sub = new Subscription();

  constructor(public chatFacade: ChatFacadeService) { }

  ngOnInit(): void {
    this.chatFacade.init();

    this.sub.add(
      this.chatFacade.message$.subscribe((msgs) => {
        this.messages = msgs;
        setTimeout(() => this.scrollToBottom(), 0);
      })
    );
  }

  sendMessage() {
    if (!this.messageText.trim()) return
    this.chatFacade.send(this.messageText);
    this.messageText = '';
  }

  trackByMsgId(_: number, msg: ChatMessage) {
    return msg._id;
  }

  private scrollToBottom() {
    const el = document.getElementById('chat-scroll-container');
    if (el) el.scrollTop = el.scrollHeight;
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
