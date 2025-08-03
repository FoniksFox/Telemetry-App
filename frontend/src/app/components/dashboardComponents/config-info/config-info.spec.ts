import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigInfo } from './config-info';

describe('ConfigInfo', () => {
  let component: ConfigInfo;
  let fixture: ComponentFixture<ConfigInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigInfo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfigInfo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
