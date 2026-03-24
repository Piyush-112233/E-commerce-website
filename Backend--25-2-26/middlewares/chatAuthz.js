import mongoose from "mongoose";

export function isValidObjectid(id) {
    return mongoose.Types.ObjectId.isValid(id)
}

export function canCustomerAccessConversation(conv, userId) {
    return String(conv.customerId) === String(userId)
}

export function canAdminAccessConversation(conv, user) {
    if (user.role === "admin") {
        return true
    }

    return false
}