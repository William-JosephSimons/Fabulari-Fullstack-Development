import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../../services/auth/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const currentUser = auth.getCurrentUser();

  if (!currentUser || !auth.getAuthToken()) {
    auth.clearLogin();
    return router.createUrlTree(['/login']);
  }

  // Only the two known system roles can be trusted for route permissions.
  if (currentUser.systemRole !== 'user' && currentUser.systemRole !== 'superAdmin') {
    auth.logout();
    return router.createUrlTree(['/login']);
  }

  const requiredRole = route.data['systemRole'];

  if (requiredRole && currentUser.systemRole !== requiredRole) {
    const dashboard =
      currentUser.systemRole === 'superAdmin'
        ? '/super-admin-dashboard'
        : '/user-dashboard';

    return router.createUrlTree([dashboard]);
  }

  return true;
};
