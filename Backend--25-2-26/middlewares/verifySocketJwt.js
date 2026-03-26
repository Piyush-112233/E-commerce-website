//Auth middleware uses await verifySocketJwt(token) ✅

import jwt from "jsonwebtoken"
import UserModel from "../model/user.model.js"

const verifySocketJwt = async (token) => {
    if (!token) throw new Error("Token missing");
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await UserModel.findById(decodedToken?._id).select("-password -refreshToken");

    if (!user) {
        throw new Error("Invalid access token");
    }

    return user;
}

export default verifySocketJwt;