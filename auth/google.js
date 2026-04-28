const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL
    },
    function(accessToken, refreshToken, profile, cb) {
        // Transform Google profile to match our user structure
        const user = {
            id: profile.id,
            name: profile.displayName,
            email: profile.emails && profile.emails[0] ? profile.emails[0].value : 'no-email@google.com',
            profileImage: profile.photos && profile.photos[0] ? profile.photos[0].value : 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            bio: 'Google user - bio not set',
            phone: 'Not provided',
            campus: 'Main Campus',
            role: 'Student',
            stats: { lost: 0, found: 0, returned: 0 },
            coverImage: 'https://i.pinimg.com/1200x/41/74/b9/4174b96d7a37d5982fe53cba5343beab.jpg',
            provider: 'google'
        };
        return cb(null, user);
    }
));

// Serialize user into the sessions
passport.serializeUser(function(user, cb) {
    cb(null, user);
});

// Deserialize user from the sessions
passport.deserializeUser(function(user, cb) {
    cb(null, user);
});
