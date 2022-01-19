import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import { fromEvent } from 'rxjs';
import { TimeLineUtilService } from '../util/time-line-util.service';

interface TimeLieSizer {
  width: number;
  height: number;
}

@Injectable()
export class MediaTimelineService {

  /** 最长标尺线的长度 */
  private scaleLineHeight: number = 14;
  private textColor = 'rgba(176, 187, 197, 1)';
  private date: Date | null | undefined;
  private currentTime: Date | null | undefined;
  canvas?: HTMLCanvasElement | null;
  ctx?: CanvasRenderingContext2D | null;
  // 记录
  private pointX = 0; // 鼠标指的位置
  private isMouseIn = false;
  private isMouseDown = false;
  create(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    // 为了防止比例不对，每次创建前都需要重绘
  }

  constructor(
    private timeLineUtilService: TimeLineUtilService,
    private datepipe: DatePipe
  ) { }


  // 初始化背景
  private initBackGround() {
    if (this.ctx && this.canvas) {
      this.ctx.fillStyle = 'rgba(17, 19, 21, 1)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = 'rgba(24, 28, 33, 1)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.scaleLineHeight);
    }
  }

  // 重新适配大小
  resize(sizer?: TimeLieSizer | Partial<TimeLieSizer>) {
    if (this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = sizer && sizer.width ? sizer.width : rect.width;
      this.canvas.height = sizer && sizer.height ? sizer.height : rect.height;
      this.scaleLineHeight = this.canvas.height / 2;
    }
  }

  // 中间线条表示当前时间所在刻度
  drawLineCenter() {
    if (this.canvas && this.ctx) {
      const lineColor = 'rgba(58, 241, 251, 1)';
      const startX = Math.floor(this.canvas.width / 2);
      const endY = this.scaleLineHeight * 2;
      this.timeLineUtilService.drawLine(startX, 0, startX, endY, lineColor, 1, this.ctx);
      this.timeLineUtilService.drawInvertedTriangle(startX, 0, this.scaleLineHeight * 0.3, lineColor, this.ctx);
    }
  }

  // ----------------------------------以下绘制刻度相关---------------------------------
  // 绘制刻度秒
  drawSecond() {
    if (this.canvas && this.ctx) {
      const lineColor = 'rgba(109, 120, 145, 1)';
      const perSecondSize = 5; // 一秒钟所需要的像素
      const startX = Math.floor(this.canvas.width / 2 / perSecondSize);
      // 绘制左边
      for (let i = startX; i >= 0; i--) {
        if (this.date) {
          const newDate = this.date?.getTime() - (startX - i) * 1000;
          const tempDate = new Date(newDate).getTime();
          let x = i * perSecondSize;
          if (tempDate % (10 * 1000) === 0) {
            this.timeLineUtilService.drawLine(x, 0, x, this.scaleLineHeight / 1.2, lineColor, 1, this.ctx);
          } else if (tempDate % (5 * 1000) === 0) {
            this.timeLineUtilService.drawLine(x, 0, x, this.scaleLineHeight / 2, lineColor, 1, this.ctx);
          } else {
            this.timeLineUtilService.drawLine(x, 0, x, this.scaleLineHeight / 3, lineColor, 1, this.ctx);
          }

          if (tempDate % 60000 === 0) {
            this.ctx.fillStyle = this.textColor;
            this.ctx.fillText(this.datepipe.transform(tempDate, 'HH:mm') || '', x - 12, this.scaleLineHeight * 1.5);
          }
        }
      }

      const startXY = Math.floor(this.canvas.width / perSecondSize);
      // 绘制右边
      for (let i = startX + 1, j = 1; i <= startXY; i++, j++) {
        if (this.date) {
          const newDate = this.date?.getTime() + j * 1000;
          const tempDate = new Date(newDate).getTime();
          let x = i * perSecondSize;
          if (tempDate % (10 * 1000) === 0) {
            this.timeLineUtilService.drawLine(x, 0, x, this.scaleLineHeight / 1.2, lineColor, 1, this.ctx);
          } else if (tempDate % (5 * 1000) === 0) {
            this.timeLineUtilService.drawLine(x, 0, x, this.scaleLineHeight / 2, lineColor, 1, this.ctx);
          } else {
            this.timeLineUtilService.drawLine(x, 0, x, this.scaleLineHeight / 3, lineColor, 1, this.ctx);
          }
          if (tempDate % 60000 === 0) {
            this.ctx.fillStyle = this.textColor;
            this.ctx.fillText(this.datepipe.transform(tempDate, 'HH:mm') || '', x - 12, this.scaleLineHeight * 1.5);
          }
        }
      }
    }
  }

  // 重新绘制
  repint() {
    this.clearCanvas();
    this.resize();
    this.initBackGround();
    this.drawLineCenter();
    this.drawSecond();
    if (this.isMouseIn) {
      this.paintIndicatorLine(this.pointX);
    }
  }

  // 通过外部修改时间
  setTime(date?: Date) {
    this.date = new Date(this.datepipe.transform(date, 'yyyy-MM-dd HH:mm:ss') || '');
    const timestr = this.datepipe.transform(this.date, 'yyyy-MM-dd HH:mm:00') || '';
    this.currentTime = new Date(timestr);
    this.repint();
  }

  /** 清空画布，只保留背景 */
  private clearCanvas(): void {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.initBackGround();
  }

  // 按照声明周期应该清空
  destory() {
    this.canvas = null;
    this.ctx = null;
  }

  // ------------------------以下为事件处理------------------------
  subscribeEvent(canvas: HTMLCanvasElement) {
    let startEvent: { x: number; };
    let endEvent;
    const rect = canvas.getBoundingClientRect();
    fromEvent(canvas, 'mousemove').subscribe((e: any) => {
      if ((e.y - rect.top) > (this.scaleLineHeight)) {
        canvas.style.cursor = 'pointer';
        this.pointX = e.x - rect.left;
        this.repint();
        this.isMouseIn = true;
      } else {
        canvas.style.cursor = 'auto';
        this.isMouseIn = false;
        this.repint();
      }
    });

    fromEvent(canvas, 'mouseout').subscribe((e: any) => {
      this.isMouseIn = false;
      this.repint();
    });

    fromEvent(canvas, 'mousedown').subscribe((e: any) => {
      startEvent = e;
      this.isMouseDown = true;
      canvas.style.cursor = 'grab';
      this.pointX = e.x - rect.left;
      this.repint();
      this.isMouseIn = true;
    });

    fromEvent(canvas, 'mouseup').subscribe((e: any) => {
      this.isMouseDown = false;
      endEvent = e;
      const dataX = endEvent.x - startEvent.x;
      if (this.date && this.canvas && endEvent && endEvent && dataX < 5) { // 移动太小认为是点击
        const startX = Math.floor(this.canvas.width / 2);
        const moved = Math.floor((startEvent.x - startX) / 5);
        if (moved < 0) {
          const newDate = (this.date?.getTime()) + moved * 1000;
          this.setTime(new Date(newDate));
        }
      } else {

      }
    });
  }

  private paintIndicatorLine(x: number) {
    if (this.canvas) {
      this.timeLineUtilService.drawLine(x, 0, x, this.canvas.height, 'white', 0.5, this.canvas.getContext('2d') as any);
    }
  }
}
