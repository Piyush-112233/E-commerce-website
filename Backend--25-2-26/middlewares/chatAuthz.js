import mongoose from "mongoose";

export function isValidObjectid(id) {
    return mongoose.Types.ObjectId.isValid(id)
}

export function canCustomerAccessConversation(conv, userId) {
    return String(conv.customerId) === String(userId)
}

export function canAdminAccessConversation(conv, user) {
    const role = String(user.role || (user.isAdmin ? "admin" : "user")).toLowerCase();
    if (role === "admin") {
        return true;
    }
    
    // Also allow if the user is assigned as the agent for this conversation
    if (conv.adminId && String(conv.adminId) === String(user._id)) {
        return true;
    }

    return false;
}