import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FirstRunSetup } from './first-run-setup';

describe('FirstRunSetup', () => {
  let component: FirstRunSetup;
  let fixture: ComponentFixture<FirstRunSetup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FirstRunSetup],
    }).compileComponents();

    fixture = TestBed.createComponent(FirstRunSetup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
