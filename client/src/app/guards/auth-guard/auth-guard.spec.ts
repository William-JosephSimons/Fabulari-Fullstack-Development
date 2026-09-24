import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { authGuard } from './auth-guard';

describe('authGuard', () => {
  let auth: any;
  let router: Router;

  // Run the guard
  function executeGuard(requiredRole?: string) {
    const route = {
      data: requiredRole ? { systemRole: requiredRole } : {},
    } as ActivatedRouteSnapshot;

    return TestBed.runInInjectionContext(() => {
      return authGuard(route, {} as RouterStateSnapshot);
    });
  }

  beforeEach(() => {
    auth = {
      getCurrentUser: vi.fn(),
      getAuthToken: vi.fn(),
      clearLogin: vi.fn(),
      logout: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Auth, useValue: auth }],
    });
    router = TestBed.inject(Router);
  });

  it('redirects a visitor without a complete login', () => {
    auth.getCurrentUser.mockReturnValue(null);
    auth.getAuthToken.mockReturnValue(null);

    const result = executeGuard();

    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
    expect(auth.clearLogin).toHaveBeenCalledOnce();
  });

  it('returns a normal user to their dashboard when a Super Admin role is required', () => {
    auth.getCurrentUser.mockReturnValue({ systemRole: 'user' });
    auth.getAuthToken.mockReturnValue('test-token');

    const result = executeGuard('superAdmin');

    expect(router.serializeUrl(result as UrlTree)).toBe('/user-dashboard');
  });

  it('allows navigation when the stored role matches the route', () => {
    auth.getCurrentUser.mockReturnValue({ systemRole: 'superAdmin' });
    auth.getAuthToken.mockReturnValue('test-token');

    const result = executeGuard('superAdmin');

    expect(result).toBe(true);
  });
});
