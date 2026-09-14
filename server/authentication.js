import { getDatabase } from "./database.js";
import { ensureText } from "./routes/route-helpers.js";

function getBearerToken(req) {
  const authorization = ensureText(req.headers.authorization);

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return ensureText(authorization.slice(7));
}

async function getAuthenticatedUser(req) {
  const token = getBearerToken(req);

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

export {
  getBearerToken,
  getAuthenticatedUser,
  requireLogin,
  requireSuperAdmin,
};
