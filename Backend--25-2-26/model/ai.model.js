import mongoose from "mongoose";

const aiMessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['human', 'ai'],
        required: true
    },
    content: {
        type: String,
        required: true
    }
}, { _id: false });

const aiConversationSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    history: [aiMessageSchema],    // Array of history objects
    status: {
        type: String,
        enum: ['active', 'closed'],
        default: 'active'
    }
}, { timestamps: true });

const AiConversationModel = mongoose.model('AiConversation', aiConversationSchema);

export default AiConversationModel;