import { Component, OnDestroy, OnInit } from '@angular/core';
import { ChatMessage, Conversation } from '../../chat/types/chat.types';
import { ChatApiService } from '../../chat/services/chat-api.service';
import { ChatSocketService } from '../../chat/services/chat-socket.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css'],
})
export class Chat implements OnInit, OnDestroy {
  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  messages: ChatMessage[] = [];
  messageText = '';
  statusFilter: 'open' | 'assigned' | 'pending' | 'closed' = 'open';
  private sub = new Subscription();

  constructor(
    private api: ChatApiService,
    private socket: ChatSocketService
  ) { }

  ngOnInit(): void {
    this.socket.connect();
    this.loadConversations();

    this.sub.add(
      this.socket.onNewMessage().subscribe(({ conversationId, message }) => {
        if (this.selectedConversation?._id === conversationId) {
          this.messages = [...this.messages, message];
          setTimeout(() => this.scrollToBottom(), 0);
        }

        this.conversations = this.conversations.map((c) =>
          c._id === conversationId
            ? { ...c, lastMessageText: message.text, lastMessageAt: message.createdAt }
            : c
        );
      })
    );
  }

  loadConversations() {
    this.api.getAdminConversations(this.statusFilter, 50).subscribe({
      next: (res) => {
        console.log('admin conversation', res)
        this.conversations = res.data.conversation ?? []; // verify backend key
        if (this.selectedConversation) {
          this.selectedConversation =
            this.conversations.find(c => c._id === this.selectedConversation!._id) ?? null;
        }
      },
      error: (err) => console.error(err),
    });
  }

  selectConversation(conv: Conversation) {
    this.selectedConversation = conv;
    this.messages = [];
    this.socket.joinConversation(conv._id);

    this.api.getMessage(conv._id, 50).subscribe({
      next: (res) => {
        this.messages = res.data.messages ?? []; // verify backend key
        setTimeout(() => this.scrollToBottom(), 0);
      },
      error: (err) => console.error(err),
    });
  }

  assignSelected() {
    if (!this.selectedConversation) return;
    this.api.assignConversation(this.selectedConversation._id).subscribe({
      next: (res) => {
        this.selectedConversation = res.data.conv;
        this.loadConversations();
      },
      error: (err) => console.error(err),
    });
  }

  closeSelected() {
    if (!this.selectedConversation) return;
    this.api.closeConversation(this.selectedConversation._id).subscribe({
      next: (res: any) => {
        this.selectedConversation = res.data.conv;
        this.loadConversations();
      },
      error: (err: any) => console.error(err),
    });
  }

  sendMessage() {
    const text = this.messageText.trim();
    if (!this.selectedConversation || !text) return;

    const convId = this.selectedConversation._id;
    this.socket.sendMessage(convId, text).subscribe({
      next: () => { this.messageText = ''; },
      error: (err) => alert(err)
    });
  }

  trackByConv(_: number, c: Conversation) { return c._id; }
  trackByMsg(_: number, m: ChatMessage) { return m._id; }

  private scrollToBottom() {
    const el = document.getElementById('admin-chat-scroll');
    if (el) el.scrollTop = el.scrollHeight;
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.socket.disconnect();
  }
}