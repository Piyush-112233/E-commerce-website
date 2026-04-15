import { Component, OnInit } from '@angular/core';
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
  constructor(public aiChatService: AiChatService) { }
  userInput = '';

  ngOnInit(): void {
    this.aiChatService.loadHistory();    // Load conversation history when chat opens
  }

  sendMessage() {
    if (!this.userInput.trim()) return;
    this.aiChatService.sendMessageStream(this.userInput);
    this.userInput = '';  // Clear Input
  }
}
