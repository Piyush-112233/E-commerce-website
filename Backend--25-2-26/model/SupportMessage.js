import mongoose from "mongoose";

const message = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "conversation",
        required: true,
        index: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true
    },
    senderRole: {
        type: String,
        enum: ['customer', 'admin'],
        required: true,
        index: true
    },
    attachments: [
        new mongoose.Schema({
            url: String,
            public_id: String,
            type: { type: String },
            name: String,
            size: Number
        })
    ],
    readBy: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
            readAt: { type: Date, default: Date.now }
        }
    ],
    type: {
        type: String,
        enum: ['text', 'file'],
        default: 'text'
    },
    text: {
        type: String,
        default: ''
    },

}, { timestamps: true })

//Indexes 
message.index(
    {
        conversationId: 1,
        createdAt: -1
    }
);

message.index(
    {
        senderId: 1,
        createdAt: -1
    }
)

const MessageModel = mongoose.model('message', message);

export default MessageModel;