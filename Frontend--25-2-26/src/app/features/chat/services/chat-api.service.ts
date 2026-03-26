import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiResponse, ChatMessage, Conversation } from "../types/chat.types";

@Injectable({ providedIn: 'root' })

export class ChatApiService {
    private baseUrl = 'http://localhost:3000/api'

    constructor(private http: HttpClient) { }

    createOrGetConversation(): Observable<ApiResponse<{ conv: Conversation }>> {
        return this.http.post<ApiResponse<{ conv: Conversation }>>(
            `${this.baseUrl}/conversations`,
            {},
            { withCredentials: true }
        )
    }

    getConversationById(conversationId: string) {
        return this.http.get<ApiResponse<{ conv: Conversation }>>(
            `${this.baseUrl}/conversations/${conversationId}`,
            { withCredentials: true }
        );
    }

    getMessage(conversationId: string, limit = 30, before?: string) {
        let url = `${this.baseUrl}/conversations/${conversationId}/messages?limit=${limit}`;
        if (before) url += `&before=${encodeURIComponent(before)}`;

        return this.http.get<ApiResponse<{ messages: ChatMessage[] }>>(url, {
            withCredentials: true,
        })
    }



    // ADMIN
    getAdminConversations(status = 'open', limit = 50) {
        return this.http.get<ApiResponse<{ conversation: Conversation[] }>>(
            `${this.baseUrl}/admin/conversations?status=${status}&limit=${limit}`,
            { withCredentials: true }
        )
    }

    assignConversation(conversationId: string) {
        return this.http.post<ApiResponse<{ conv: Conversation }>>(
            `${this.baseUrl}/admin/conversations/${conversationId}/assign`,
            {},
            { withCredentials: true }
        );
    }


    closeConversation(conversationId: string) {
        return this.http.post<ApiResponse<{ conv: Conversation }>>(
            `${this.baseUrl}/admin/conversations/${conversationId}/close`,
            {},
            { withCredentials: true }
        );
    }
}