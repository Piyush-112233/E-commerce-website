import { Component, OnDestroy, OnInit, NgZone } from '@angular/core';
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
    private socket: ChatSocketService,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.socket.connect();
    this.loadConversations();

    this.sub.add(
      // from socket service
      this.socket.onNewMessage().subscribe(({ conversationId, message }) => {
        if (this.selectedConversation?._id === conversationId) {
          const exists = this.messages.some(m => m._id === message._id);
          if (!exists) {
            this.messages = [...this.messages, message];
            if (!this.maintainingScroll) {
              setTimeout(() => this.scrollToBottom(), 0);
            }
          }
        }

        this.conversations = this.conversations.map((c) => {
          if (c._id === conversationId) {
            // read function
            const isSelected = this.selectedConversation?._id === conversationId;
            if (isSelected) {
              this.socket.markRead(conversationId);
            }
            return {
              ...c,
              lastMessageText: message.text,
              lastMessageAt: message.createdAt,
              unreadCountAdmin: isSelected ? 0 : (c.unreadCountAdmin || 0) + (message.senderRole === 'customer' ? 1 : 0)
            };
          }
          return c;
        });
      })
    );
  }

  loadConversations() {
    // from api service
    this.api.getAdminConversations(this.statusFilter, 50).subscribe({
      next: (res) => {
        // console.log('admin conversation', res)
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
    // read function
    this.socket.markRead(conv._id);
    conv.unreadCountAdmin = 0;

    this.api.getMessage(conv._id, 50).subscribe({
      next: (res) => {
        this.messages = res.data.messages ?? []; // verify backend key
        this.maintainingScroll = false; // Reset on new conversation
        setTimeout(() => this.scrollToBottom(), 0);
      },
      error: (err) => console.error(err),
    });
  }

  private loadingMore = false;
  private maintainingScroll = false;
  async onScroll(event: Event) {
    const el = event.target as HTMLElement;
    if (el.scrollTop === 0 && this.messages.length > 0 && !this.loadingMore) {
      const prevHeight = el.scrollHeight;
      this.loadingMore = true;
      this.maintainingScroll = true;

      const before = this.messages[0].createdAt;
      this.api.getMessage(this.selectedConversation!._id, 30, before).subscribe({
        next: (res) => {
          const older = res.data.messages || [];
          if (older.length > 0) {
            this.messages = [...older, ...this.messages];

            this.ngZone.runOutsideAngular(() => {
              setTimeout(() => {
                const newHeight = el.scrollHeight;
                el.scrollTop = newHeight - prevHeight;
                this.maintainingScroll = false;
              }, 50);
            });
          }
          this.loadingMore = false;
        },
        error: (err) => {
          console.error(err);
          this.loadingMore = false;
          this.maintainingScroll = false;
        }
      });
    }
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
    if (this.selectedConversation.status === 'closed') return;

    this.api.closeConversation(this.selectedConversation._id).subscribe({
      next: (res) => {
        this.selectedConversation = res.data.conv;
        this.loadConversations();
      },
      error: (err) => console.error(err.message),
    });
  }

  // from socket service...
  sendMessage() {
    const text = this.messageText.trim();
    if (!this.selectedConversation || !text) return;
    if (this.selectedConversation.status === 'closed') return;

    const convId = this.selectedConversation._id;
    this.messageText = '';

    this.socket.sendMessage(convId, text).subscribe({
      next: (newMsg) => {
        if (newMsg) {
          const exists = this.messages.some(m => m._id === newMsg._id);
          if (!exists) {
            this.messages = [...this.messages, newMsg];
            setTimeout(() => this.scrollToBottom(), 0);
          }
          this.conversations = this.conversations.map((c) =>
            c._id === convId
              ? { ...c, lastMessageText: newMsg.text, lastMessageAt: newMsg.createdAt }
              : c
          );
        }
      },
      error: (err) => {
        console.error(err);
        this.messageText = text; // Restore on error
      }
    });
  }

  trackByConv(_: number, c: Conversation) { return c._id; }
  trackByMsg(_: number, m: ChatMessage) { return m._id; }

  private scrollToBottom() {
    const el = document.getElementById('admin-chat-scroll');
    if (el && !this.maintainingScroll) el.scrollTop = el.scrollHeight;
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.socket.disconnect();
  }
}