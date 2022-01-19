import { TestBed } from '@angular/core/testing';

import { MediaTimelineService } from './media-timeline.service';

describe('MediaTimelineService', () => {
  let service: MediaTimelineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MediaTimelineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
