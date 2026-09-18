import { accountRoutes } from "./routes/account-routes.js";
import { adminRoutes } from "./routes/admin-routes.js";
import { groupRoutes } from "./routes/group-routes.js";
import { messageRoutes } from "./routes/message-routes.js";
import { requestRoutes } from "./routes/request-routes.js";

// Register each feature's routes on the same Express application.
function routes(app, io) {
  accountRoutes(app);
  groupRoutes(app, io);
  messageRoutes(app, io);
  requestRoutes(app, io);
  adminRoutes(app);
}

export { routes };
