import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Auth } from '../../services/auth/auth';
import { Profile } from './profile';

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let router: Router;
  let auth: any;

  beforeEach(async () => {
    auth = {
      getProfile: vi.fn().mockReturnValue(
        of({
          valid: true,
          user: {
            id: 'user-1',
            username: 'jordan',
            email: 'jordan@example.com',
            firstName: 'Jordan',
            lastName: 'Lee',
            birthdate: '2002-02-12',
            avatarUrl: null,
          },
        }),
      ),
      saveCurrentUser: vi.fn(),
      getUploadUrl: vi.fn().mockReturnValue(''),
      updateProfile: vi.fn(),
      uploadProfileImage: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi
        .fn()
        .mockReturnValue(of({ valid: true, message: 'Your account has been deleted.' })),
      clearLogin: vi.fn(),
      logout: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [provideRouter([]), { provide: Auth, useValue: auth }],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('loads the profile while keeping the email field read only', () => {
    const emailInput = fixture.nativeElement.querySelector('#profile-email') as HTMLInputElement;

    expect(emailInput.value).toBe('jordan@example.com');
    expect(emailInput.readOnly).toBe(true);
    expect(auth.saveCurrentUser).toHaveBeenCalled();
  });

  it('rejects an invalid birthdate before sending an update', () => {
    const testComponent = component as any;
    testComponent.profile.birthdate = 'not-a-date';

    testComponent.saveProfile();

    expect(testComponent.profileError).toBe(
      'Enter a valid birthdate for an age between 1 and 120.',
    );
    expect(auth.updateProfile).not.toHaveBeenCalled();
  });

  it('rejects the wrong profile image type before uploading', () => {
    const testComponent = component as any;
    const input = {
      files: [new File(['plain text'], 'notes.txt', { type: 'text/plain' })],
      value: 'notes.txt',
    };

    testComponent.uploadAvatar({ target: input } as any);

    expect(testComponent.profileError).toBe('Choose a PNG, JPEG or GIF profile image.');
    expect(input.value).toBe('');
    expect(auth.uploadProfileImage).not.toHaveBeenCalled();
  });

  it('clears the login and returns to login after account deletion', () => {
    const navigate = vi.spyOn(router, 'navigate');

    (component as any).deleteAccount();

    expect(auth.deleteAccount).toHaveBeenCalledOnce();
    expect(auth.clearLogin).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
