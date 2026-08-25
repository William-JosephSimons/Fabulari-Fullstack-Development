import { accountRoutes } from "./routes/account-routes.js";
import { adminRoutes } from "./routes/admin-routes.js";
import { groupRoutes } from "./routes/group-routes.js";
import { requestRoutes } from "./routes/request-routes.js";

function routes(app) {
  accountRoutes(app);
  groupRoutes(app);
  requestRoutes(app);
  adminRoutes(app);
}

export { routes };
