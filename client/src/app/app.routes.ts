import { Routes } from '@angular/router';
import { AdminRequests } from './components/admin-requests/admin-requests';
import { AdminUsers } from './components/admin-users/admin-users';
import { AuditLogs } from './components/audit-logs/audit-logs';
import { Chat } from './components/chat/chat';
import { FirstRunSetup } from './components/first-run-setup/first-run-setup';
import { authGuard } from './guards/auth-guard/auth-guard';
import { GroupAdminDashboard } from './components/group-admin-dashboard/group-admin-dashboard';
import { GroupDetail } from './components/group-detail/group-detail';
import { GroupRequests } from './components/group-requests/group-requests';
import { Groups } from './components/groups/groups';
import { Login } from './components/login/login';
import { Profile } from './components/profile/profile';
import { Register } from './components/register/register';
import { Requests } from './components/requests/requests';
import { RoomManagement } from './components/room-management/room-management';
import { SuperAdminDashboard } from './components/super-admin-dashboard/super-admin-dashboard';
import { UserDashboard } from './components/user-dashboard/user-dashboard';

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
    path: 'groups/:groupId/admin',
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
