import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        trim: true,
    },
    //Check if user verified email
    emailVerified: {
        type: Boolean,
        default: false
    },
    // stroee token send to email
    emailVerificationToken: {
        type: String
    },
    // Token expire Time
    emailVerificationExpire: {
        type: Date
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    password: {
        type: String,
        required: function () {
            // Allow Google OAuth users to exist without a local password.
            return !this.googleId;
        }
    },
    passwordResetToken: {
        type: String,
    },
    passwordResetTokenExpireAt: {
        type: Date,
    },
    role: {
        type: String,
        enum: ["customer", "admin", "user"],
        default: "user"
    },
    refreshToken: {
        type: String
    },
    isAdmin: {
        type: Boolean
    }
}, { timestamps: true });

//Middleware Hooks - pre
userSchema.pre("save", async function () {
    if (!this.isModified('password') || !this.password) {
        return;
    }
    this.password = await bcrypt.hash(this.password, 10);
})

//Compare password
userSchema.methods.isCorrectPassword = async function (password) {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password)
}

//Access Token
userSchema.methods.generateAccessToken = function () {
    try {
        return jwt.sign(
            {
                _id: this._id,
                name: this.name,
                email: this.email,
                role: this.role
            },
            process.env.ACCESS_TOKEN_SECRET,
            {
                expiresIn: process.env.ACCESS_TOKEN_EXPIRY
            }
        )
    } catch (error) {
        return error
    }
}

//Refresh Token
userSchema.methods.generateRefreshToken = function () {
    try {
        return jwt.sign(
            {
                _id: this._id,
                role: this.role
            },
            process.env.REFRESH_TOKEN_SECRET,
            {
                expiresIn: process.env.REFRESH_TOKEN_EXPIRY
            }
        )
    } catch (error) {
        return error
    }
}

const UserModel = mongoose.model("user", userSchema)

export default UserModel;
