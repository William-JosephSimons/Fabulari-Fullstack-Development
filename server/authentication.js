import { getDatabase } from "./database.js";
import { ensureText } from "./routes/route-helpers.js";

// Read the opaque token from an Authorization: Bearer header.
function getBearerToken(req) {
  const authorization = ensureText(req.headers.authorization);

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return ensureText(authorization.slice(7));
}

// Resolve a session to its account and remove it if that account was deleted.
async function getUserFromToken(token) {
  if (!token) {
    return null;
  }

  const database = getDatabase();
  const session = await database.collection("authSessions").findOne({ token });

  if (!session) {
    return null;
  }

  const user = await database
    .collection("users")
    .findOne({ id: session.userId });

  if (!user) {
    // A session cannot remain valid after its user has been deleted.
    await database.collection("authSessions").deleteOne({ token });
    return null;
  }

  return user;
}

// Combine header parsing and session lookup for protected HTTP routes.
async function getAuthenticatedUser(req) {
  return getUserFromToken(getBearerToken(req));
}

// Send the shared 401 response when an HTTP request has no valid account.
async function requireLogin(req, res) {
  const user = await getAuthenticatedUser(req);

  if (!user) {
    res.status(401).json({
      valid: false,
      message: "A valid login session is required.",
    });
    return null;
  }

  return user;
}

// Apply the system-role check after the normal login check succeeds.
async function requireSuperAdmin(req, res) {
  const user = await requireLogin(req, res);

  if (!user) {
    return null;
  }

  if (user.systemRole !== "superAdmin") {
    res.status(403).json({
      valid: false,
      message: "Only the Super Admin can use this route.",
    });
    return null;
  }

  return user;
}

// Middleware form of requireLogin used before Multer processes an upload.
async function loginRequiredMiddleware(req, res, next) {
  const user = await requireLogin(req, res);

  if (user) {
    req.currentUser = user;
    next();
  }
}

export {
  getBearerToken,
  getUserFromToken,
  getAuthenticatedUser,
  requireLogin,
  requireSuperAdmin,
  loginRequiredMiddleware,
};
