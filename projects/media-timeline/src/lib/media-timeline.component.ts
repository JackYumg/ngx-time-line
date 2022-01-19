import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, forwardRef, OnDestroy, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { fromEvent } from 'rxjs';
import { TimelineEventService } from '../events/timeline-event.service';
import { MediaTimelineService } from './media-timeline.service';

export let CODE_MIRROR_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => MediaTimelineComponent),
  multi: true
};

@Component({
  selector: 'ngx-media-timeline',
  template: `
      <div>{{value}}</div>
    <canvas></canvas>
  `,
  styles: [
  ],
  styleUrls: [
    './media-timeline.module.less'
  ],
  providers: [
    CODE_MIRROR_VALUE_ACCESSOR,
    MediaTimelineService,
    TimelineEventService
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MediaTimelineComponent implements OnInit, ControlValueAccessor, OnDestroy {


  private dataValue?: Date = new Date();

  set value(value: Date | undefined) {
    if (!(value instanceof Date) && value) {
      throw new Error(`value of ${value} is not a type Date`);
    } else {
      this.dataValue = value;
      this.cdk.detectChanges();
    }
  }

  get value(): Date | undefined {
    return this.dataValue;
  }

  constructor(
    private elmentRef: ElementRef,
    private mediaTimelineService: MediaTimelineService,
    private datepipe: DatePipe,
    private cdk: ChangeDetectorRef,
    private timelineEventService: TimelineEventService
  ) { }
  writeValue(obj: Date): void {
    this.value = obj;
    if (this.value) {
      this.mediaTimelineService.setTime(this.dataValue);
    }
  }
  registerOnChange(fn: any): void {
  }
  registerOnTouched(fn: any): void {
  }

  ngOnInit(): void {
    const canvas = this.elmentRef.nativeElement.children[1];
    this.mediaTimelineService.create(canvas);
    this.mediaTimelineService.subscribeEvent(canvas);
  }

  ngOnDestroy() {
    this.mediaTimelineService.destory();
  }
}
