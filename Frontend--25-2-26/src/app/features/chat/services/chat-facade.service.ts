import { Injectable } from "@angular/core";
import { BehaviorSubject, firstValueFrom } from "rxjs";
import { ChatMessage, Conversation } from "../types/chat.types";
import { ChatApiService } from "./chat-api.service";
import { ChatSocketService } from "./chat-socket.service";

@Injectable({ providedIn: 'root' })

export class ChatFacadeService {
    private conversation$ = new BehaviorSubject<Conversation | null>(null);
    private messageSubject = new BehaviorSubject<ChatMessage[]>([]);
    readonly message$ = this.messageSubject.asObservable();

    private unreadSubject = new BehaviorSubject<number>(0);
    readonly unreadCount$ = this.unreadSubject.asObservable();

    constructor(
        private api: ChatApiService,
        private socket: ChatSocketService
    ) { }

    private initializing = false;
    private initialized = false;
    private msgSub?: any;

    async init(token?: string, force = false) {
        if (force) this.reset();
        if ((this.initialized && !force) || this.initializing) return;
        this.initializing = true;

        try {
            const convRes = await firstValueFrom(this.api.createOrGetConversation());
            if (!convRes?.data?.conv) return;
            
            const conv = convRes.data.conv;
            this.conversation$.next(conv);
            this.socket.connect(token);
            this.socket.joinConversation(conv._id);
            this.unreadSubject.next(conv.unreadCountCustomer || 0);

            this.messageSubject.next([]);
            await this.loadMore();

            if (this.msgSub) this.msgSub.unsubscribe();
            this.msgSub = this.socket.onNewMessage().subscribe(({ message }) => {
                const currentMsgs = this.messageSubject.value ?? [];
                if (!currentMsgs.some(m => m._id === message._id)) {
                    this.messageSubject.next([...currentMsgs, message]);
                    if (message.senderRole === 'admin') {
                        this.unreadSubject.next(this.unreadSubject.value + 1);
                    }
                }
            });

            this.initialized = true;
        } catch (err) {
            console.error('Chat init failed:', err);
            this.initialized = false;
        } finally {
            this.initializing = false;
        }
    }

    reset() {
        this.initialized = false;
        this.initializing = false;
        if (this.msgSub) {
            this.msgSub.unsubscribe();
            this.msgSub = undefined;
        }
        this.conversation$.next(null);
        this.messageSubject.next([]);
        this.unreadSubject.next(0);
        this.socket.disconnect?.();
    }

    private loadingMore = false;
    async loadMore() {
        if (this.loadingMore) return;
        const conv = this.conversation$.value;
        if (!conv) return;

        this.loadingMore = true;
        try {
            const currentMsgs = this.messageSubject.value || [];
            const before = currentMsgs.length > 0 ? currentMsgs[0].createdAt : undefined;

            const res = await firstValueFrom(this.api.getMessage(conv._id, 30, before));
            const olderMsgs = res?.data.messages || [];

            if (olderMsgs.length > 0) {
                this.messageSubject.next([...olderMsgs, ...currentMsgs]);
            }
        } catch (err) {
            console.error('Failed to load older messages:', err);
        } finally {
            this.loadingMore = false;
        }
    }

    markAsRead() {
        const conv = this.conversation$.value;
        if (conv) {
            this.socket.markRead(conv._id);
            this.unreadSubject.next(0);
        }
    }

    send(text: string, file: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            const conv = this.conversation$.value;
            if (!conv || (!text.trim() && file.length === 0)) {
                resolve(null);
                return;
            }
            this.socket.sendMessage(conv._id, text.trim(), file).subscribe({
                next: (newMsg) => {
                    if (newMsg) {
                        const currentMsgs = this.messageSubject.value ?? [];
                        const exists = currentMsgs.some(m => m._id === newMsg._id);
                        if (!exists) {
                            this.messageSubject.next([...currentMsgs, newMsg]);
                        }
                    }
                    resolve(newMsg);
                },
                error: (err) => {
                    console.error('Failed to send message:', err);
                    reject(err);
                }
            });
        });
    }
}