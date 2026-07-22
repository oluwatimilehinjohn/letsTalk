const session = require("express-session");
const { MongoStore } = require("connect-mongo");

function createSessionMiddleware() {
  const sessionSecret = process.env.SESSION_SECRET;
  const mongoUri = process.env.MONGO_URI;

  if (!sessionSecret) {
    throw new Error(
      "SESSION_SECRET is missing from the environment variables"
    );
  }

  if (!mongoUri) {
    throw new Error(
      "MONGO_URI is missing from the environment variables"
    );
  }

  const isProduction =
    process.env.NODE_ENV === "production";

  return session({
    name: "letstalk.sid",

    secret: sessionSecret,

    resave: false,

    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: mongoUri,
      collectionName: "sessions",

      // Session expires after seven days
      ttl: 7 * 24 * 60 * 60,

      // Avoid updating MongoDB on every request
      touchAfter: 24 * 60 * 60,
    }),

    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });
}

module.exports = createSessionMiddleware;