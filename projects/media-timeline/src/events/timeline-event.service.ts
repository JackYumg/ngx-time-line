import { Injectable } from '@angular/core';
import { fromEvent } from 'rxjs';
import { MediaTimelineService } from '../lib/media-timeline.service';
import { TimeLineUtilService } from '../util/time-line-util.service';

@Injectable()
export class TimelineEventService {


  constructor(
    private service: TimeLineUtilService,
    private mediaTimelineService: MediaTimelineService
  ) { }

  subscribeEvent(canvas: HTMLCanvasElement) {
    fromEvent(canvas, 'mousemove').subscribe((e: any) => {
      canvas.style.cursor = 'pointer';
      const rect = canvas.getBoundingClientRect();
      this.mediaTimelineService.repint();
      this.paintIndicatorLine(e.x - rect.left, canvas);
    });
  }

  private paintIndicatorLine(x: number, canvas: HTMLCanvasElement) {
    this.service.drawLine(x, 0, x, canvas.height, 'white', 0.5, canvas.getContext('2d') as any);
  }

  destroy() {

  }
}
