import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { ChatMessage, Conversation } from "../types/chat.types";
import { ChatApiService } from "./chat-api.service";
import { ChatSocketService } from "./chat-socket.service";

@Injectable({ providedIn: 'root' })

export class ChatFacadeService {
    private conversation$ = new BehaviorSubject<Conversation | null>(null);
    private messageSubject = new BehaviorSubject<ChatMessage[]>([]);
    readonly message$ = this.messageSubject.asObservable();

    constructor(
        private api: ChatApiService,
        private socket: ChatSocketService
    ) { }

    async init(token?: string) {
        const convRes = await this.api.createOrGetConversation().toPromise();
        const conv = convRes!.data.conv;
        this.conversation$.next(conv);

        const msgRes = await this.api.getMessage(conv._id).toPromise();
        const msg = msgRes!.data.messages || [];
        this.messageSubject.next(msg);

        this.socket.connect(token);
        this.socket.joinConversation(conv._id);

        this.socket.onNewMessage().subscribe(({ message }) => {
            this.messageSubject.next([...(this.messageSubject.value ?? []), message]);
        });
    }

    send(text: string) {
        const conv = this.conversation$.value;
        if (!conv || !text.trim()) return;
        this.socket.sendMessage(conv._id, text.trim()).subscribe();
    }
}