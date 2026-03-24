import UserModel from "../model/user.model.js";
import { ApiError } from "../validators/ApiError.js"
import jwt from "jsonwebtoken"

// there is use of req,next but not use of res then we use _ instead of res (res ---> _) we see this in production level 
const isAuthVerifyJwt = async (req, _, next) => {
  try {
    const cookieToken = req.cookies?.accessToken;
    const authHeader = req.header("Authorization");

    const tokenFromHeader = authHeader?.replace(/^Bearer\s+/i, "").trim();
    const token = cookieToken || tokenFromHeader;
    
    if (!token) {
      return new ApiError(401, "Unauthorized, doesn't have token");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    const user = await UserModel.findById(decodedToken?._id).select("-password -refreshToken")

    if (!user) {
      new ApiError(400, "Invalid Access Token")
    }

    req.user = user;
    next();
  } catch (error) {
    new ApiError(400, error?.message || "Invalid Access Token")
  }
}

export default isAuthVerifyJwt;