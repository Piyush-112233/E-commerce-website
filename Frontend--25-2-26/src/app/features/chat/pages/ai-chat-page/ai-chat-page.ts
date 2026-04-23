import { Component, ElementRef, OnInit, ViewChild, effect } from '@angular/core';
import { AiChatService } from '../../services/aiChat-service';
import { FormsModule } from '@angular/forms';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  selector: 'app-ai-chat-page',
  imports: [FormsModule, MarkdownModule],
  templateUrl: './ai-chat-page.html',
  styleUrl: './ai-chat-page.css',
})
export class AiChatPage implements OnInit {

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  constructor(public aiChatService: AiChatService) {
    effect(() => {
      aiChatService.messages();

      setTimeout(() => {
        const el = this.messagesContainer?.nativeElement;
        if (el && this.autoScrollEnabled) {
          el.scrollTo({
            top: el.scrollHeight,
            behavior: 'auto'
          });
          this.showScrollDown = false;
        } else if (el) {
          this.showScrollDown = !this.isNearBottom(el);
        }
      }, 50);
    });
  }

  userInput = '';
  showScrollDown = false;
  private autoScrollEnabled = true;
  private readonly bottomThreshold = 80;

  ngOnInit(): void {
    this.aiChatService.loadHistory();
  }

  sendMessage() {
    if (!this.userInput.trim()) return;

    this.autoScrollEnabled = true;
    this.aiChatService.sendMessageStream(this.userInput);
    this.userInput = '';
  }

  onMessagesScroll() {
    const el = this.messagesContainer?.nativeElement;
    if (!el) return;

    const nearBottom = this.isNearBottom(el);
    this.showScrollDown = !nearBottom;
    this.autoScrollEnabled = nearBottom;
  }

  scrollToBottom(behavior: ScrollBehavior = 'auto') {
    const el = this.messagesContainer?.nativeElement;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior,
    });

    this.showScrollDown = false;
    this.autoScrollEnabled = true;
  }

  private isNearBottom(el: HTMLDivElement): boolean {
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom <= this.bottomThreshold;

    // 👉 Formula samajh lo:

    //   scrollHeight → total content height
    //   scrollTop → kitna scroll ho chuka
    //   clientHeight → visible area

    // 👉 Difference = bottom se distance
  }
}
