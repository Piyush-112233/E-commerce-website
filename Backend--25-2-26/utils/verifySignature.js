import crypto from 'crypto';

/**
 * Verifies the signature from Razorpay
 * @param {string} orderId - The Razorpay Order ID
 * @param {string} paymentId - The Razorpay Payment ID
 * @param {string} signature - The Razorpay Signature
 * @param {string} secret - The Razorpay Secret Key
 * @returns {boolean} - Returns true if the signature matches
 */
export const verifyPaymentSignature = (orderId, paymentId, signature, secret) => {
    const generated_signature = crypto
        .createHmac('sha256', secret)
        .update(orderId + "|" + paymentId)
        .digest('hex');

    return generated_signature === signature;
};


// /**
//  * Verify Webhook Signature
//  * @param {string} body - Raw webhook body (as string)
//  * @param {string} signature - X-Razorpay-Signature header
//  * @param {string} secret - Webhook Secret Key
//  * @returns {boolean}
//  */

// export const verifyWebhookSignature = (body, signature, secret) => {
//     const expectedSignature = crypto
//         .createHmac('sha256', secret)
//         .update(body)
//         .digest('hex')

//     return signature === expectedSignature;
// }