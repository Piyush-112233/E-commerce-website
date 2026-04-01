import express from "express";
import isAuthVerifyJwt from "../middlewares/isAuth.middleware.js";
import { addToCart, getCart, updateCartItem, removeFromCart, clearCart, syncCart, addToWishlist, getWishlist, removeFromWishList } from "../controllers/user.controller.js";

const cartAndWishlistRouter = express.Router();

// Cart routes
cartAndWishlistRouter.post("/cart/add", isAuthVerifyJwt, addToCart);
cartAndWishlistRouter.get("/cart/get", isAuthVerifyJwt, getCart);
cartAndWishlistRouter.put("/cart/update", isAuthVerifyJwt, updateCartItem);
cartAndWishlistRouter.delete("/cart/remove", isAuthVerifyJwt, removeFromCart);
cartAndWishlistRouter.delete("/cart/clear", isAuthVerifyJwt, clearCart);
cartAndWishlistRouter.post("/cart/sync", isAuthVerifyJwt, syncCart);

// Wishlist routes
cartAndWishlistRouter.post("/wishlist/add", isAuthVerifyJwt, addToWishlist);
cartAndWishlistRouter.get("/wishlist/get", isAuthVerifyJwt, getWishlist);
cartAndWishlistRouter.delete("/wishlist/remove", isAuthVerifyJwt, removeFromWishList);

export default cartAndWishlistRouter;