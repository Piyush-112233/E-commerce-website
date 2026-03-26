import UserModel from "../model/user.model.js";
import { ApiError } from "../validators/ApiError.js"
import jwt from "jsonwebtoken"

// there is use of req,next but not use of res then we use _ instead of res (res ---> _) we see this in production level 
const isAuthVerifyJwt = async (req, res, next) => {
  try {
    const cookieToken = req.cookies?.accessToken;
    const authHeader = req.header("Authorization");

    const tokenFromHeader = authHeader?.replace(/^Bearer\s+/i, "").trim();
    const token = cookieToken || tokenFromHeader;
    
    if (!token) {
      return res.status(401).json(new ApiError(401, "Unauthorized, token missing"));
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    const user = await UserModel.findById(decodedToken?._id).select("-password -refreshToken")

    if (!user) {
      return res.status(401).json(new ApiError(401, "Invalid access token"));
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json(new ApiError(401, error?.message || "Invalid access token"));
  }
}

export default isAuthVerifyJwt;