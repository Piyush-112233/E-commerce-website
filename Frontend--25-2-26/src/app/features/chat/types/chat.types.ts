export interface Conversation {
    _id: string,
    customerId: string;
    adminId: string | null;
    status: 'open' | 'assigned' | 'pending' | 'closed';
    lastMessageAt: string;
    lastMessageText: string;
    unreadCountCustomer: number;
    unreadCountAdmin: number;
}

export interface Attachment {
    url: string;
    public_id: string;
    type: 'image' | 'file';
}

export interface ChatMessage {
    _id: string;
    conversationId: string;
    senderId: string;
    senderRole: 'customer' | 'admin';
    text: string;
    attachments?: Attachment[];  // ← ADD THIS LINE
    type: 'text' | 'file';
    readBy: Array<{
        userId: string;
        readAt: string;
    }>;
    createdAt: string;
    updatedAt: string;
}

export interface ApiResponse<T> {
    statusCode: number;
    data: T;
    message?: string;
}