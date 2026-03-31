import express from "express";
import isAuthVerifyJwt from "../middlewares/isAuth.middleware.js";
import { addToCart, getCart, updateCartItem, removeFromCart, clearCart, syncCart, addToWishlist, getWishlist, removeFromWishList } from "../controllers/user.controller.js";

const cartAndWishlistRouter = express.Router();

// All cart routes require authentication
cartAndWishlistRouter.post("/add", isAuthVerifyJwt, addToCart);
cartAndWishlistRouter.get("/get", isAuthVerifyJwt, getCart);
cartAndWishlistRouter.put("/update", isAuthVerifyJwt, updateCartItem);
cartAndWishlistRouter.delete("/remove", isAuthVerifyJwt, removeFromCart);
cartAndWishlistRouter.delete("/clear", isAuthVerifyJwt, clearCart);
cartAndWishlistRouter.post("/sync", isAuthVerifyJwt, syncCart);



// const wishListRouter = express.Router();

// All wishlist routes require authentication
cartAndWishlistRouter.post("/add", isAuthVerifyJwt, addToWishlist);
cartAndWishlistRouter.get("/get", isAuthVerifyJwt, getWishlist);
cartAndWishlistRouter.delete("/remove", isAuthVerifyJwt, removeFromWishList)

// export { cartRouter, wishListRouter };
export default cartAndWishlistRouter;