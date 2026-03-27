import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { io, Socket } from "socket.io-client"
// import { ChatMessage } from "../types/chat.types";

@Injectable({ providedIn: 'root' })

export class ChatSocketService {
    private socket!: Socket;
    private url = 'http://localhost:3000';

    connect(token?: string) {
        this.socket = io(this.url, {
            path: '/socket.io',
            withCredentials: true,
            transports: ['websocket'],
            auth: token ? { token } : {},
        });
        // console.log("connect");
    }

    onAuthOk(): Observable<{ userId: string; role: string }> {
        return new Observable((observer) => {
            this.socket.on('Auth:ok', (data) => observer.next(data));
        });
    }

    joinConversation(conversationId: string) {
        this.socket.emit('chat:join', { conversationId });
    }

    markRead(conversationId: string) {
        if (this.socket) {
            this.socket.emit('chat:markRead', { conversationId });
        }
    }

    sendMessage(conversationId: string, text: string, file: any[] = []): Observable<any> {
        return new Observable((observer) => {
            this.socket.emit('chat:send', { conversationId, text, file }, (ack: any) => {
                if (ack?.ok) {
                    observer.next(ack.message);
                    observer.complete();
                } else {
                    observer.error(ack?.error || 'Send failed');
                }
            });
        });
    }

    onNewMessage(): Observable<{ conversationId: string; message: any }> {
        return new Observable((observer) => {
            const handler = (payload: any) => observer.next(payload);
            this.socket.on('chat:new', handler);
            return () => this.socket.off('chat:new', handler);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}