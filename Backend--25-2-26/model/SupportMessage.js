import mongoose from "mongoose";

const message = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "conversation",
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    senderRole: {
        type: String,
        enum: ['customer' | 'admin' | 'system'],
        required: true
    },
    type:{
        type: String,
        enum: ['text'| 'image' | 'file' | 'system'],
        default: 'text'
    },

    text: 'string',

}, {timestamps: true})

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