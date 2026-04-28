// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;

// passport.use(new GoogleStrategy({
//     clientID: process.env.GOOGLE_CLIENT_ID,
//     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//     callbackURL: process.env.GOOGLE_CALLBACK_URL
//     },
//     function(accessToken, refreshToken, profile, cb) {
//         // Transform Google profile to match our user structure
//         const user = {
//             id: profile.id,
//             name: profile.displayName,
//             email: profile.emails && profile.emails[0] ? profile.emails[0].value : 'no-email@google.com',
//             profileImage: profile.photos && profile.photos[0] ? profile.photos[0].value : 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
//             bio: 'Google user - bio not set',
//             phone: 'Not provided',
//             campus: 'Main Campus',
//             role: 'Student',
//             stats: { lost: 0, found: 0, returned: 0 },
//             coverImage: 'https://i.pinimg.com/1200x/41/74/b9/4174b96d7a37d5982fe53cba5343beab.jpg',
//             provider: 'google'
//         };
//         return cb(null, user);
//     }
// ));

// // Serialize user into the sessions
// passport.serializeUser(function(user, cb) {
//     cb(null, user);
// });

// // Deserialize user from the sessions
// passport.deserializeUser(function(user, cb) {
//     cb(null, user);
// });
require('dotenv').config();

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');

// Debug: Verify environment variables
if (!process.env.GOOGLE_CLIENT_ID) {
  console.error('❌ GOOGLE_CLIENT_ID is missing in .env file!');
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  console.error('❌ GOOGLE_CLIENT_SECRET is missing in .env file!');
}
if (!process.env.GOOGLE_CALLBACK_URL) {
  console.error('❌ GOOGLE_CALLBACK_URL is missing in .env file!');
}

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  profilePic: String,
  bio: String,
  phone: String,
  campus: String,
  role: String,
  stats: {
    lost: Number,
    found: Number,
    returned: Number,
  },
  googleId: String,
  provider: String
});

const User = mongoose.model("User", userSchema);

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async function(accessToken, refreshToken, profile, cb) {
        try {
            const googleEmail = profile.emails && profile.emails[0] 
                ? profile.emails[0].value 
                : 'no-email@google.com';
            
            let user = await User.findOne({ 
                $or: [
                    { email: googleEmail },
                    { googleId: profile.id }
                ]
            });

            if (user) {
                if (!user.googleId) {
                    user.googleId = profile.id;
                    user.provider = 'google';
                    if (!user.profilePic || user.profilePic === '/images/default.png') {
                        user.profilePic = profile.photos && profile.photos[0] 
                            ? profile.photos[0].value 
                            : '/images/default.png';
                    }
                    await user.save();
                }
                console.log('✅ Existing Google user logged in:', user.email);
                return cb(null, user);
            }

            const newUser = new User({
                name: profile.displayName,
                email: googleEmail,
                password: 'google-auth-' + profile.id,
                profilePic: profile.photos && profile.photos[0] 
                    ? profile.photos[0].value 
                    : '/images/default.png',
                bio: 'Google user - bio not set',
                phone: 'Not provided',
                campus: 'Main Campus',
                role: 'Student',
                stats: { lost: 0, found: 0, returned: 0 },
                googleId: profile.id,
                provider: 'google'
            });

            await newUser.save();
            console.log('✅ New Google user saved to MongoDB:', newUser.email);
            
            return cb(null, newUser);
        } catch (error) {
            console.error('❌ Error in Google Strategy:', error);
            return cb(error, null);
        }
    }
));

passport.serializeUser(function(user, cb) {
    cb(null, user._id);
});

passport.deserializeUser(async function(id, cb) {
    try {
        const user = await User.findById(id);
        cb(null, user);
    } catch (error) {
        cb(error, null);
    }
});
