import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import UserModel from "../model/user.model.js";
import passport from "passport";


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            const googleId = profile?.id;
            const email = profile?.emails?.[0]?.value?.toLowerCase();
            const name = profile?.displayName || profile?.name?.givenName || "google-user";
            const role = profile?.role?.[0].value

            if (!googleId) {
                return done(new Error("Google profile id missing"), null);
            }
            if (!email) {
                return done(new Error("Google account email missing"), null);
            }

            // Link by googleId first, then fall back to email.
            let user = await UserModel.findOne({ googleId });
            if (!user) {
                user = await UserModel.findOne({ email });
            }

            if (!user) {
                user = await UserModel.create({
                    name,
                    email,
                    googleId,
                    role
                });
            } else if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }

            return done(null, user);

        } catch (error) {
            return done(error, null);
        }
    }
))

export default passport;
