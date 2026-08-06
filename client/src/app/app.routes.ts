import { Routes } from '@angular/router';
import { AdminUsers } from './admin-users/admin-users';
import { AuditLogs } from './audit-logs/audit-logs';
import { Chat } from './chat/chat';
import { FirstRunSetup } from './first-run-setup/first-run-setup';
import { GroupAdminDashboard } from './group-admin-dashboard/group-admin-dashboard';
import { GroupDetail } from './group-detail/group-detail';
import { Groups } from './groups/groups';
import { Login } from './login/login';
import { Profile } from './profile/profile';
import { Register } from './register/register';
import { Requests } from './requests/requests';
import { RoomManagement } from './room-management/room-management';
import { SuperAdminDashboard } from './super-admin-dashboard/super-admin-dashboard';
import { UserDashboard } from './user-dashboard/user-dashboard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Authentication pages do not use the signed-in application navigation.
  { path: 'setup', component: FirstRunSetup },
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  { path: 'user-dashboard', component: UserDashboard },
  { path: 'group-admin-dashboard', component: GroupAdminDashboard },
  { path: 'super-admin-dashboard', component: SuperAdminDashboard },
  { path: 'groups', component: Groups },

  // More specific parameter routes come before the general group-detail route.
  { path: 'groups/:groupId/rooms/:roomId', component: Chat },
  { path: 'groups/:groupId/rooms', component: RoomManagement },
  { path: 'groups/:groupId', component: GroupDetail },

  { path: 'requests', component: Requests },
  { path: 'profile', component: Profile },
  // Requests is shared, so route data tells it which navigation variant to display.
  { path: 'admin/requests', component: Requests, data: { navigation: 'superAdmin' } },
  { path: 'admin/users', component: AdminUsers },
  { path: 'admin/audit-logs', component: AuditLogs },

  // The wildcard route must stay last because Angular uses the first matching route.
  { path: '**', redirectTo: 'login' }
];
