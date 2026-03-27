import { Component, NgZone } from '@angular/core';
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
  selectedFile: File | null = null;
  fileName: string = '';
  isUploading: boolean = false;

  private sub = new Subscription();

  constructor(public chatFacade: ChatFacadeService, private ngZone: NgZone) { }

  ngOnInit(): void {
    this.chatFacade.init();

    this.sub.add(
      this.chatFacade.message$.subscribe((msgs) => {
        this.ngZone.run(() => {
          this.messages = msgs;
          setTimeout(() => this.scrollToBottom(), 0);
        })
      })
    );
  }


  // Handle file selection
  onFileSelected(event: any) {
    const file = event.target.files?.[0];

    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB")
        event.target.value = '';
        return;
      }

      // validate file type (image Only)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only image files are allowed');
        event.target.value = '';
        return;
      }

      this.selectedFile = file;
      this.fileName = file.name;
    }
  }

  // remove selected File
  removeSelectedFile() {
    this.selectedFile = null;
    this.fileName = '';
  }



  async sendMessage() {
    if (!this.messageText.trim() && !this.selectedFile) {
      alert('Please enter a message or selected file');
      return;
    }

    this.isUploading = true;

    try {
      let fileData = null;

      // send file to base64 if selected
      if (this.selectedFile) {
        fileData = await this.fileToBase64(this.selectedFile)
      }

      // send message with fileData
      await this.chatFacade.send(this.messageText, fileData ? [fileData] : []);

      this.messageText = '';
      this.selectedFile = null;
      this.fileName = '';

    } catch (error) {
      console.error('Send failed:', error);
      alert('Failed to send message');

    } finally {
      this.isUploading = false;
    }
  }


  // convert file into base64
  private fileToBase64(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          type: file.type,
          data: reader.result // base64 string
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
