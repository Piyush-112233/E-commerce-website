import UserModel from "../model/user.model.js";
import { ApiError } from "../validators/ApiError.js";
import { ApiResponse } from "../validators/ApiResponse.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import emailQueue from "../bullMq/queue.js/email.queue.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        // find user by id
        const user = await UserModel.findById(userId)
        // generate token
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // database me save
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        // generate
        return { accessToken, refreshToken }

    } catch (error) {
        return new ApiError(400, "Wrong while generating Access and Refresh Token")
    }
}

const signUpUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(401).json(
                new ApiError(400, "All fields are Required")
            );
        }

        const userExist = await UserModel.findOne({ email })
        if (userExist) {

            if (!userExist.emailVerified) {
                return res.status(200).json(202,
                    {
                        message: "User already registered, please verify your email"
                    }
                )
            }
            return res.status(400).json(
                new ApiError(400, "User Already Exist")
            )
        }

        const newUser = await UserModel.create({
            name,
            email,
            password,
            role,
            emailVerified: false
        })

        const rawToken = crypto.randomBytes(32).toString("hex");
        console.log("Raw token:", rawToken);
        const hashedToken = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");
        const expireVerification = Number(10)


        newUser.emailVerificationToken = hashedToken;
        newUser.emailVerificationExpire = new Date(Date.now() + expireVerification * 60 * 1000);

        await newUser.save({ validateBeforeSave: false });

        const verificationUrl = `http://localhost:3000/api/users/verify-email/${rawToken}`

        await emailQueue.add("EmailVerification",
            {
                email: newUser.email,
                name: newUser.name,
                link: verificationUrl,
                token: rawToken
            }
        )
        console.log("Verification job added");

        // // we remove password and refreshToken !!
        const createdUser = await UserModel.findById(newUser._id).select(
            "-password -refreshToken"
        )

        // check for user creation is it coming or not !!
        if (!createdUser) {
            return res.status(500).json(
                new ApiError(500, "Something went wrong while signing the user")
            )
        }

        return res.status(201).json(
            new ApiResponse(200, createdUser, 'User Created Successfully')
            // {
            //     message: "User created Succesfully",
            //     name: newUser.name,
            //     email: newUser.email,
            //     _id: newUser._id
            // }
        )
    } catch (error) {
        // for debugging
        // console.error(error)
        return res.status(500).json(
            // console.log("❌ Signup Error:", error),
            new ApiError(500, `Server error ${error.message}`)
            // {
            //     message: `Server error ${error.message}`
            // }
        );
    }
}

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await UserModel.findOne(
            {
                emailVerificationToken: hashedToken,
                emailVerificationExpire: { $gt: new Date() }
            }
        )

        if (!user) {
            return res.status(401).json(
                new ApiError(404,
                    {
                        message: "Invalid or expired token"
                    }
                )
            );
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpire = undefined;

        await user.save({ validateBeforeSave: false });

        return res.status(201).json(
            new ApiResponse(200,
                {
                    message: "Email verified successfully"
                }
            )
        )
    } catch (error) {
        console.log(error)
        return res.status(502).json(
            new ApiError(500,
                {
                    message: "Server error"
                }
            )
        );
    }
}

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email) {
            return res.status(401).json(
                console.log(new ApiError(400, "Email is Required"))
            )
        }
        // console.log("-----1");
        const user = await UserModel.findOne({ email })
        if (!user) {
            return res.status(401).json(
                console.log(new ApiError(400, "User don't Exist .Please signUp !!"))
            )
        }
        // console.log("-----2");
        if (!user.emailVerified) {
            return res.status(401).json(
                console.log(new ApiError(400, { message: "Please verify your email first" }))
            );
        }
        // console.log("-----3");
        const isMatch = await user.isCorrectPassword(password);
        if (!isMatch) {
            return res.status(400).json(
                console.log(new ApiError(400, "Invalid Email or Password"))
            )
        }
        // console.log("-----4");

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
        const loggedInUser = await UserModel.findById(user._id).select(" -password -refreshToken ")

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            sameSite: 'none',
            secure: true
        }).cookie('refreshToken', refreshToken, {
            httpOnly: true,
            sameSite: 'none',
            secure: true
        })

        return res.status(201).json(
            new ApiResponse(200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User Logged In Successfully"
            )
        )
    } catch (error) {
        console.log("-----#", error)
        return res.status(501).json(
            new ApiError(500, `Server Error ${error.message}`)
        );
    }
}

const forgetPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(401).json(
                new ApiError(400, "Email is Required")
            )
        }
        // console.log("----1",email)
        const user = await UserModel.findOne({ email })
        if (!user) {
            return res.status(401).json(
                new ApiError(400, "User don't Exist .Please signUp !!")
            )
        }

        // for hashing -- 2 methods

        //1st
        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto
            .createHash('sha256')
            .update(rawToken)
            .digest('hex');

        const expireIn = Number(process.env.PASSWORD_RESET_TOKEN_EXPIRE || 15)

        //2nd
        // const resetToken = jwt.sign(
        //     { id: user._id },
        //     process.env.RESET_PASSWORD_SECRET,
        //     { expiresIn: "10m"}
        // );


        user.passwordResetToken = hashedToken;
        user.passwordResetTokenExpireAt = new Date(Date.now() + expireIn * 60 * 1000)

        await user.save({ validateBeforeSave: false });

        const resetLink = `http://localhost:4200/auth/reset-password/${rawToken}`;
        // console.log(resetLink);

        await emailQueue.add("ResetPasswordEmail",
            {
                email: user.email,
                name: user.name,
                link: resetLink
            })
        // console.log("Job added:", job.id);

        return res.status(201).json(

            "Forgot Successfully"
        )
    } catch (error) {
        console.log(error)
        return res.status(501).json(
            new ApiError(500, `Server Error ${error}`)
        );
    }
}

const resetPassword = async (req, res) => {
    try {
        const { token } = req.params
        const { newPassword } = req.body;

        // console.log("Token from params:", token);

        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
        // console.log("Hashed token:", hashedToken);

        const user = await UserModel.findOne(
            {
                passwordResetToken: hashedToken,
                passwordResetTokenExpireAt: { $gt: new Date() }
            }
        )
        // console.log(user.passwordResetToken);

        // const decoded = jwt.verify(
        //     token,
        //     process.env.RESET_PASSWORD_SECRET
        // );

        // const user = await UserModel.findById(decoded.id);

        if (!user) {
            return res.status(404).json(
                new ApiError(401,
                    {
                        message: "Invalid or expired token"
                    }
                ));
        }

        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetTokenExpireAt = undefined;

        await user.save({ validateBeforeSave: false });

        res.status(201).json(
            new ApiResponse,
            { message: "Password Reset Successfull" }
        )
    } catch (error) {
        res.status(400).json(
            new ApiError(501,
                {
                    message: "Invalid or expired token"
                }
            )
        );
    }
}

const logoutUser = async (req, res) => {
    try {
        await UserModel.findByIdAndUpdate(
            req.user._id,
            {
                $set:
                {
                    refreshToken: undefined
                },

            },
            {
                new: true
            }
        )

        res.clearCookie("accessToken", {
            httpOnly: true,
            sameSite: 'none',
            secure: true
        }).clearCookie("refreshToken", {
            httpOnly: true,
            sameSite: 'none',
            secure: true
        })

        return res.status(201).json(
            new ApiResponse(200,
                {},
                "User Logged Out"
            )
        )
    } catch (error) {
        return res.status(501).json(
            ApiError(500, error.message, "Server Error")
        )
    }
}

const RefreshAccessToken = async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

        if (!incomingRefreshToken) {
            new ApiError(400, "Unauthorized Request");
        }

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await UserModel.findById(decodedToken?._id)

        if (!user) {
            new ApiError(401, "Invalid Refresh Token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            new ApiError(401, "Refresh Token is Expired or used")
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            sameSite: 'none',
            secure: true
        }).cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            sameSite: 'none',
            secure: true
        });

        return res.status(201).json(
            new ApiResponse(200,
                { accessToken, refreshToken: newRefreshToken },
                "Access Token refreshed"
            )
        )

    } catch (error) {
        res.status(501).json(
            new ApiError(500,
                error?.message,
                "Inavlid refresh Token"
            )
        )
    }
}

const changeCurrentPassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await UserModel.findById(req.user?._id)

    const isCorrectPassword = await user.isCorrectPassword(oldPassword)
    if (!isCorrectPassword) {
        new ApiError(400, "Inavlid Old Password")
    }

    user.password = newPassword
    user.save({ validateBeforeSave: false })

    res.status(201).json(
        new ApiResponse(200, "Password Change Succesfully")
    )
}

const updateAccountDetails = async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName, !email) {
        new ApiError(400, "All field are Required")
    }

    const user = UserModel.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {
            new: true
        }
    ).
        select("-password")

    return res.status(200).json(
        new ApiResponse(200,
            user,
            "Account details updated Successfully"
        )
    )
}

const getUserProfile = async (req, res) => {
    try {
        const user = req.user

        res.status(201).json(
            new ApiResponse(200,
                {
                    message: "User Profile"
                },
                user
            )
        )
    } catch (error) {
        console.log("PROFILE ERROR:", error);
        return res.status(501).json(
            new ApiError(500, `Server Error ${error}`)
        );
    }
}


const auth = async (req, res) => {
    try {
        const user = await UserModel.findById(req.user._id).select('_id email role name');

        if (!user) return res.status(401).json(
            new ApiError(401, { message: "Unauthorized" })
        )

        return res.status(200).json(
            new ApiResponse(200,
                {
                    id: user.id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            )
        )
    } catch (error) {

    }
}

// const googleSignIn = async (req, res) => {
//     const {code} = req.query;
//     if(!code){
//         new ApiError(400,"Authorization Code Missing")
//     }
// }

export { signUpUser, verifyEmail, loginUser, forgetPassword, resetPassword, logoutUser, RefreshAccessToken, changeCurrentPassword, updateAccountDetails, getUserProfile, auth , getUsers}



const getUsers = async (req, res) => {
    const {page = 1, limit = 10} = req.query;
    const skip = (page - 1) * limit;

    const users = await UserModel.find().populate('-password').skip(skip).limit(limit);

    res.status(200).json(
        new ApiResponse(200, {
            message: "User Fetched Successfully",
            users
        })
    )
}