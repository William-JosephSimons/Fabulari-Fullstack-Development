import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Auth } from './auth';

describe('Auth service', () => {
  let service: Auth;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Auth);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('stores and restores both parts of a login', () => {
    const user = { id: 'user-1', username: 'jordan', systemRole: 'user' };

    service.saveLogin(user, 'test-token');

    expect(service.getCurrentUser()).toEqual(user);
    expect(service.getAuthToken()).toBe('test-token');
    expect(service.getAuthHeaders()).toEqual({ Authorization: 'Bearer test-token' });
    expect(service.isLoggedIn()).toBe(true);
  });

  it('requires both the user and token to count as logged in', () => {
    service.saveCurrentUser({ id: 'user-1' });

    expect(service.isLoggedIn()).toBe(false);

    localStorage.setItem('authToken', 'test-token');
    service.clearLogin();

    expect(service.getCurrentUser()).toBeNull();
    expect(service.getAuthToken()).toBeNull();
  });

  it('ends the server session and clears local storage on logout', () => {
    service.saveLogin({ id: 'user-1' }, 'test-token');

    service.logout();

    const logoutRequest = httpTesting.expectOne('http://localhost:3000/api/logout');
    expect(logoutRequest.request.method).toBe('POST');
    expect(logoutRequest.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(service.getCurrentUser()).toBeNull();
    expect(service.getAuthToken()).toBeNull();
    logoutRequest.flush({ valid: true });
  });
});
