import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommandButton } from './command-button';

describe('CommandButton', () => {
  let component: CommandButton;
  let fixture: ComponentFixture<CommandButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommandButton]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommandButton);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
