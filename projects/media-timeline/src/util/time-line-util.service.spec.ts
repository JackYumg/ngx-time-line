import { TestBed } from '@angular/core/testing';

import { TimeLineUtilService } from './time-line-util.service';

describe('TimeLineUtilService', () => {
  let service: TimeLineUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimeLineUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
