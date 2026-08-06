import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperAdminNavigation } from './super-admin-navigation';

describe('SuperAdminNavigation', () => {
  let component: SuperAdminNavigation;
  let fixture: ComponentFixture<SuperAdminNavigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperAdminNavigation],
    }).compileComponents();

    fixture = TestBed.createComponent(SuperAdminNavigation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
