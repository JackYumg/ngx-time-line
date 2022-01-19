import { DatePipe } from '@angular/common';
import { NgModule } from '@angular/core';
import { TimelineEventService } from '../events/timeline-event.service';
import { TimeLineUtilService } from '../util/time-line-util.service';
import { MediaTimelineComponent } from './media-timeline.component';



@NgModule({
  declarations: [
    MediaTimelineComponent
  ],
  imports: [
  ],
  exports: [
    MediaTimelineComponent
  ],
  providers:[
    TimeLineUtilService,
    TimelineEventService,
    DatePipe
  ]
})
export class MediaTimelineModule { }
