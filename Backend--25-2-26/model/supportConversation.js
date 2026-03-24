import mongoose from "mongoose";

const conversation = new mongoose.Schema({
    customerId : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    status: {
        type: String,
        enum: ['open' | 'assigned' | 'pending' | 'closed'],
        default: "open"
    },
    lastMessageAt:{
        type: Date,
        default: Date.now
    },
    lastMessageText: String,

    closedAt: Date

}, {timestamps: true});

// Indexs
conversation.index(
    {
        customerId: 1,
        status: 1,
        lastMessageAt: -1
    }
);
conversation.index(
    {
        adminId: 1,
        status: 1,
        lastMessageAt: -1
    }
);
conversation.index(
    {
        status: 1,
        lastMessageAt: -1
    }
);

const ConversationModel = mongoose.model('conversation',conversation);

export default ConversationModel;