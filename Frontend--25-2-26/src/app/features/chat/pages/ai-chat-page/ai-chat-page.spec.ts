import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiChatPage } from './ai-chat-page';

describe('AiChatPage', () => {
  let component: AiChatPage;
  let fixture: ComponentFixture<AiChatPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiChatPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiChatPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
