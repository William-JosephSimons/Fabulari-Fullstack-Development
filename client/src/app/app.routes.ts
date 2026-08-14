import { Routes } from '@angular/router';
import { AdminRequests } from './admin-requests/admin-requests';
import { AdminUsers } from './admin-users/admin-users';
import { AuditLogs } from './audit-logs/audit-logs';
import { Chat } from './chat/chat';
import { FirstRunSetup } from './first-run-setup/first-run-setup';
import { authGuard } from './guards/auth-guard';
import { GroupAdminDashboard } from './group-admin-dashboard/group-admin-dashboard';
import { GroupDetail } from './group-detail/group-detail';
import { GroupRequests } from './group-requests/group-requests';
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

  {
    path: 'user-dashboard',
    component: UserDashboard,
    canActivate: [authGuard],
    data: { systemRole: 'user' },
  },
  {
    path: 'group-admin-dashboard',
    component: GroupAdminDashboard,
    canActivate: [authGuard],
    data: { systemRole: 'user' },
  },
  {
    path: 'super-admin-dashboard',
    component: SuperAdminDashboard,
    canActivate: [authGuard],
    data: { systemRole: 'superAdmin' },
  },
  {
    path: 'groups',
    component: Groups,
    canActivate: [authGuard],
    data: { systemRole: 'user' },
  },

  // More specific parameter routes come before the general group-detail route.
  {
    path: 'groups/:groupId/rooms/:roomId',
    component: Chat,
    canActivate: [authGuard],
    data: { systemRole: 'user' },
  },
  {
    path: 'groups/:groupId/rooms',
    component: RoomManagement,
    canActivate: [authGuard],
    data: { systemRole: 'user' },
  },
  {
    path: 'groups/:groupId/requests',
    component: GroupRequests,
    canActivate: [authGuard],
    data: { systemRole: 'user' },
  },
  {
    path: 'groups/:groupId',
    component: GroupDetail,
    canActivate: [authGuard],
    data: { systemRole: 'user' },
  },

  {
    path: 'requests',
    component: Requests,
    canActivate: [authGuard],
    data: { systemRole: 'user' },
  },
  {
    path: 'profile',
    component: Profile,
    canActivate: [authGuard],
    data: { systemRole: 'user' },
  },
  {
    path: 'admin/requests',
    component: AdminRequests,
    canActivate: [authGuard],
    data: { systemRole: 'superAdmin' },
  },
  {
    path: 'admin/users',
    component: AdminUsers,
    canActivate: [authGuard],
    data: { systemRole: 'superAdmin' },
  },
  {
    path: 'admin/audit-logs',
    component: AuditLogs,
    canActivate: [authGuard],
    data: { systemRole: 'superAdmin' },
  },

  // The wildcard route must stay last because Angular uses the first matching route.
  { path: '**', redirectTo: 'login' }
];
