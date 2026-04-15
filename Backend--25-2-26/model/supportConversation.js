import mongoose from "mongoose";

const participantSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    role: {
        type: String,
        enum: ['customer', 'admin'],
        required: true
    },
    joinedAt: {
        type: Date,
        // default: date.now
    }
});

const conversation = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null,
        index: true
    },
    participants: {
        type: [participantSchema],
        default: []
    },
    status: {
        type: String,
        enum: ['open', 'assigned', 'closed'],
        default: "open",
        index: true
    },
    lastMessageAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    lastMessageText: {
        type: String,
        default: ''
    },
    unreadCountCustomer: {
        type: Number,
        default: 0
    },
    unreadCountAdmin: {
        type: Number,
        default: 0
    }

}, { timestamps: true });

const ConversationModel = mongoose.model('conversation', conversation);

export default ConversationModel;