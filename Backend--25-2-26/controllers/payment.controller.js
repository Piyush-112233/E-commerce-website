import cartModel from "../model/cart.model.js";
import orderModel from "../model/order.js";
import paymentModel from "../model/payment.js";
import razorpayInstance from "../utils/razorpay.js";
import { verifyPaymentSignature } from "../utils/verifySignature.js";
import { ApiError } from "../validators/ApiError.js";


/**
 * Step 1: Create Order (Frontend -> Backend)
 * This Create an order in razorpay and saves data in db
*/
export const createOrder = async (req, res) => {
    try {
        const userId = req.user._id; // From auth middleware
        const configuredExpiryMinutes = Number(process.env.ORDER_EXPIRY_MINUTES);
        const orderExpiryMinutes = Number.isFinite(configuredExpiryMinutes) && configuredExpiryMinutes > 0
            ? configuredExpiryMinutes
            : 30;

        // get user's cart from DB
        const cart = await cartModel.findOne({ userId }).populate('items.productId');

        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json(
                new ApiError(400, "Cart is empty")
            )
        }

        // calculate Amount
        const totalAmount = cart.totalPrice - cart.totalDiscount;

        if (totalAmount <= 0) {
            return res.status(400).json(
                new ApiError(400, "Invalid cart amount")
            )
        }


        // create order on Razorpay
        const razorpayOrder = await razorpayInstance.orders.create({
            amount: Math.round(totalAmount * 100), // Convert to paise
            currency: 'INR',
            receipt: `rcpt_${userId.toString().slice(-6)}_${Date.now()}`,
            notes: {
                userId: userId.toString(),
                descripton: 'E-commerce Purchase'
            }
        });


        // save order in Db with PENDING Status
        const order = new orderModel({
            userId,
            cartItems: cart.items,
            totalAmount,
            totalDiscount: cart.totalDiscount,
            razorpayOrderId: razorpayOrder.id,
            status: 'Pending',
            expireAt: new Date(Date.now() + orderExpiryMinutes * 60 * 1000)
        })

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Order created successfully',
            data: {
                orderId: order._id,
                razorpayOrderId: razorpayOrder.id,
                amount: totalAmount,
                currency: 'INR',
                key: process.env.RAZORPAY_KEY_ID
            }
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(501).json(
            new ApiError(500, "Error creating order", [error.message])
        )
    }
}


/**
 * Step:2 verify Payment (frontend -> backend)
 * This is the most criticalstep -verify signature on backend
 */
export const verifypayment = async (req, res) => {
    try {
        const userId = req.user._id;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Validate input
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json(
                new ApiError(400, 'Missing payment details')
            );
        }

        // find order in db
        const order = await orderModel.findOne({
            razorpayOrderId: razorpay_order_id,
            userId
        });

        if (!order) {
            return res.status(404).json(
                new ApiError(404, "Order not found")
            );
        }

        // verify signature using Razorpay secret key
        const isSignatureValid = verifyPaymentSignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            process.env.RAZORPAY_KEY_SECRET
        )

        if (!isSignatureValid) {
            console.warn(`Invalid signature for order ${razorpay_order_id}`);

            await paymentModel.create({
                orderId: order._id,
                userId,
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                amount: order.totalAmount,
                paymentStatus: 'Failed',
                signatureVerified: false,
                failureReason: 'Signature Verified failed'
            });

            return res.status(400).json(
                new ApiError(400, 'Payment verification failed - Invalid signature')
            );
        }

        // Signature is valid - now fetch payment details from Razorpay
        const paymentdetails = await razorpayInstance.payments.fetch(razorpay_payment_id);

        // Double check: amount should match
        if (paymentdetails.amount !== Math.round(order.totalAmount * 100)) {
            return res.status(400).json({
                success: false,
                message: 'Amount mismatch',
                verified: false
            });
        }

        // Create payment record in DB
        const payment = new paymentModel({
            orderId: order._id,
            userId,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignatureId: razorpay_signature,
            amount: order.totalAmount,
            paymentStatus: paymentdetails.status === 'captured' ? 'Captured' : 'Authorized',
            signatureVerified: true,
            paymentMethod: paymentdetails.method || 'unknown'
        })

        // Update order status to paid
        order.status = 'Paid'
        order.expireAt = undefined;

        await Promise.all([
            payment.save(),
            order.save()
        ]);

        // Clear user's cart after successful payment
        await cartModel.findOneAndDelete({ userId });

        // Also clear localStorage indicator (frontend handles this)
        res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            data: {
                orderId: order._id,
                paymentId: payment._id,
                status: 'SUCCESS'
            },
            verified: true
        });

    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json(
            new ApiError(500, "Error verifying payment", [error.message])
        )
    }
}
