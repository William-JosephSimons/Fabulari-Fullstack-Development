import { accountRoutes } from "./routes/account-routes.js";
import { adminRoutes } from "./routes/admin-routes.js";
import { groupRoutes } from "./routes/group-routes.js";
import { messageRoutes } from "./routes/message-routes.js";
import { requestRoutes } from "./routes/request-routes.js";

function routes(app, io) {
  accountRoutes(app);
  groupRoutes(app);
  messageRoutes(app, io);
  requestRoutes(app, io);
  adminRoutes(app);
}

export { routes };
