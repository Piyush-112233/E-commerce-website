export interface Conversation {
    _id: string,
    customerId: string;
    adminId: string | null;
    status: 'open' | 'assigned' | 'pending' | 'closed';
    lastMessageAt: string;
    lastMessageText: string;
}

export interface ChatMessage {
    _id: string;
    conversationId: string;
    senderId: string;
    senderRole: 'customer' | 'admin';
    type: 'text';
    text: string;
    createdAt: string;
}

export interface ApiResponse<T> {
    statusCode: number;
    data: T;
    message?: string;
}