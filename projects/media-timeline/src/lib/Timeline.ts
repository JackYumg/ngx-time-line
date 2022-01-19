import { Subject } from 'rxjs';

/** 时间段 */
export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  bgColor?: string;
}

/** 步距相关 */
interface Step {
  /** 三种类型，短中长 */
  name: 'ms' | 'md' | 'lg';
  /** 每步占的 px 长度 */
  pxPerStep: number;
  /** 间隔步幅的数量 */
  interval: number;
}

type StepMin = 1 | 5 | 10 | 15 | 20 | 30 | 60 | 720;
type MouseStatus = 'mousedown' | 'mouseup' | 'mouseout' | 'mousemove' | 'wheel' | 'click';

export class TimeLine {
  // tslint:disable-next-line:variable-name
  private _timeChange = new Subject<Date>();
  timeChange$ = this._timeChange.asObservable();
  // tslint:disable-next-line:variable-name
  private _move = new Subject<Date>();
  move$ = this._move.asObservable();
  // tslint:disable-next-line:variable-name
  private _mouseStatusChange = new Subject<MouseStatus>();
  mouseStatusChange$ = this._mouseStatusChange.asObservable();

  //#region 核心画布变量
  /** 缓存画布 */
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  //#endregion

  //#region 步数、长度相关变量
  /** 三种不同的步幅 */
  private steps: Step[] = [
    /** 短步幅间隔 */
    { name: 'ms', pxPerStep: 5, interval: 5 },
    /** 中距步幅间隔 */
    { name: 'md', pxPerStep: 20, interval: 3 },
    /** 长距步幅间隔 */
    { name: 'lg', pxPerStep: 30, interval: 2 },
  ];
  /** 最短显示文字的间隔 */
  private minimumTextInterval = 60;
  /** 最长标尺线的长度 */
  private scaleLineHeight = 14;
  /** 默认文本颜色 */
  private textColor = 'rgba(176, 187, 197, 1)';
  /** 默认文本向上偏移 px */
  private textPaddingTop = this.scaleLineHeight + 13;
  /** 默认文本向左偏移 px */
  private textOffset = 14;
  //#endregion

  //#region
  /** 每步占据多少分钟 */
  private minutesPerStep: StepMin[] = [1, 5, 10, 15, 20, 30, 60];
  /** 单位切换的中间点，60分钟换算成小时，1440分钟换算成天 */
  private minuteNodes = [60, 1440];
  /** 当前一步代表的分钟 */
  private curStepMin: StepMin = 60;
  //#endregion

  //#region 时间相关
  /** 时间段的基础背景色，可被单独定制的覆盖 */
  private timeListBgColor = 'rgba(132, 244, 180, 0.6)';
  private timeList: TimeSlot[] = [];
  /** 当前的时间 */
  private curTime: Date = new Date();
  /** 拖拽移动时候的时间 */
  private moveTime: Date;
  //#endregion

  //#region 事件绑定相关
  /** 判断鼠标左键是否按下 */
  private mouseIsDown = false;
  /** 鼠标落下时的坐标位置 */
  private downPosition = { x: 0, y: 0 };
  /** 鼠标左键按下 */
  private mousedownEvent = (e: MouseEvent): void => {
    this.downPosition.x = e.x;
    this.downPosition.y = e.y;
    this.mouseIsDown = true;
    this._mouseStatusChange.next('mousedown');
  }
  /** 鼠标左键放开 */
  private mouseupEvent = (e: MouseEvent): void => {
    // 从按下到放开，左右移动距离差小于 3 则算作是点击事件
    const distanceDiff = Math.abs(e.x - this.downPosition.x);
    if (distanceDiff < 3) {
      // 点击事件，以点击处的时间为新的时间，切换重绘
      const rect = this.canvas.getBoundingClientRect();
      const centerX = Math.floor((rect.left + rect.right) / 2);
      const pxOffset = e.x - centerX;
      const step = this.getStepsByStepMin(this.curStepMin);
      const offsetMin = Math.floor((pxOffset / step.pxPerStep) * this.curStepMin);
      this.curTime = new Date(this.curTime.getTime() + offsetMin * 60 * 1000);
      this._mouseStatusChange.next('click');
    } else {
      // 鼠标左键放开事件
      this.curTime = this.moveTime;
      this._mouseStatusChange.next('mouseup');
    }
    this.repaintCanvas(this.curTime);
    this._timeChange.next(this.curTime);
    this.mouseIsDown = false;
  }
  /** 鼠标离开canvas界面 */
  private mouseoutEvent = (e: MouseEvent): void => {
    this.mouseIsDown = false;
    this.repaintCanvas(this.curTime);
    this._mouseStatusChange.next('mouseout');
  }
  /** 鼠标移动事件 */
  private mousemoveEvent = (e: MouseEvent): void => {
    if (this.mouseIsDown && this.canvas) {
      this.canvas.style.cursor = 'grab';
      const pxOffset = this.downPosition.x - e.x;
      const step = this.getStepsByStepMin(this.curStepMin);
      const offsetMin = Math.floor((pxOffset / step.pxPerStep) * this.curStepMin);
      this.moveTime = new Date(this.curTime.getTime() + offsetMin * 60 * 1000);
      this.repaintCanvas(this.moveTime);
      this._move.next(this.moveTime);
      this._mouseStatusChange.next('mousemove');
    } else if(this.canvas){
      this.canvas.style.cursor = 'pointer';
      const rect = this.canvas.getBoundingClientRect();
      this.repaintCanvas(this.curTime);
      this.paintIndicatorLine(e.x - rect.left);
    }
  }
  /** 滚轮事件，切换时间间隔大小 */
  private wheelEvent = (e: WheelEvent): void => {
    e.preventDefault();
    const biggestIdx = this.minutesPerStep.length - 1;
    const oldIdx = this.minutesPerStep.indexOf(this.curStepMin);
    let idx = e.deltaY < 0 ? oldIdx - 1 : oldIdx + 1;
    idx = idx > biggestIdx ? biggestIdx : idx;
    idx = idx < 0 ? 0 : idx;
    if (idx === oldIdx) {
      return;
    }
    this.curStepMin = this.minutesPerStep[idx];
    this.repaintCanvas(this.curTime);
    this._mouseStatusChange.next('wheel');
  }
  //#endregion

  constructor(canvasDom: HTMLCanvasElement) {
    this.ctx = canvasDom.getContext('2d');
    this.canvas = canvasDom;
    this.bindCanvasEvent();
  }

  private bindCanvasEvent(): void {
    if(this.canvas) {
      this.canvas.addEventListener('mousedown', this.mousedownEvent);
      this.canvas.addEventListener('mouseup', this.mouseupEvent);
      this.canvas.addEventListener('mouseout', this.mouseoutEvent);
      this.canvas.addEventListener('mousemove', this.mousemoveEvent);
      this.canvas.addEventListener('wheel', this.wheelEvent);
    }
  }

  /** 重设canvas的长宽 */
  private resetCanvas(): void {
    if(this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
  }

  /** 根据传入日期重绘所有内容 */
  private repaintCanvas(date: Date): void {
    this.resetCanvas();
    this.clearCanvas();
    const step = this.getStepsByStepMin(this.curStepMin);
    this.showScaleAndTime(step, date);
    this.paintTimeList(date);
    this.paintCurrentScaleAndTime(date);
  }

  /** 初始化背景 */
  private initBackground(): void {
    if(this.ctx && this.canvas) {
      this.ctx.fillStyle = 'rgba(17, 19, 21, 1)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = 'rgba(24, 28, 33, 1)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.scaleLineHeight);
    }
  }

  /** 绘制中间那条蓝线 */
  private paintCurrentScaleAndTime(date: Date): void {
    const lineColor = 'rgba(58, 241, 251, 1)';
    const startX = Math.floor(this.canvas.width / 2);
    const endY = this.scaleLineHeight * 2;
    this.drawLine(startX, 0, startX, endY, lineColor, 2);
    this.drawInvertedTriangle(startX, 0, 6, lineColor);
    // this.ctx.fillStyle = "rgb(64, 196, 255)";
    // this.ctx.fillText(this.formatDate(date), this.canvas.width / 2 - endY, 50);
  }

  /** 绘制预设时间段 */
  private paintTimeList(date: Date): void {
    const step = this.getStepsByStepMin(this.curStepMin);
    const midX = Math.floor(this.canvas.width / 2);
    this.timeList.forEach(slot => {
      const startOffsetMin = Math.floor((slot.startTime.getTime() - date.getTime()) / 1000 / 60);
      const pxOffsetStart = (startOffsetMin / this.curStepMin) * step.pxPerStep;
      const endOffsetMin = Math.floor((slot.endTime.getTime() - date.getTime()) / 1000 / 60);
      const pxOffsetEnd = (endOffsetMin / this.curStepMin) * step.pxPerStep;
      const startX = midX + pxOffsetStart;
      const cellWidth = pxOffsetEnd - pxOffsetStart;
      this.ctx.fillStyle = slot.bgColor || this.timeListBgColor;
      this.ctx.fillRect(startX, 0, cellWidth, this.scaleLineHeight);
    });
  }

  /**
   * @param step 绘制刻度线时的步幅
   * @param midDate 处于绘制中心的日期
   */
  private showScaleAndTime(step: Step, midDate: Date): void {
    let offsetMin;
    if (step.interval === 5) {
      // 每步为1分钟或者2分钟的情况下，太过拥挤，在限制字的长度间距后发现每隔3个大间距才显示，所以被余数在这种情况要多乘以3
      offsetMin = (midDate.getHours() * 60 + midDate.getMinutes()) % (this.curStepMin * step.interval * 3);
    } else {
      offsetMin = (midDate.getHours() * 60 + midDate.getMinutes()) % (this.curStepMin * step.interval);
    }
    const divideDate = new Date(midDate.getTime() - offsetMin * 60 * 1000);
    const offset = (step.pxPerStep / this.curStepMin) * offsetMin;
    const divideX = Math.floor(this.canvas.width / 2) - offset;
    // 绘制中间线和内容
    this.drawLine(divideX, 0, divideX, this.scaleLineHeight, this.textColor);
    this.ctx.fillStyle = this.textColor;
    this.ctx.fillText(this.formatDate(divideDate), divideX - this.textOffset, this.textPaddingTop);
    // 绘制左半边内容
    this.paintScaleAndTime(divideDate, divideX, step, true);
    // 绘制右半边内容
    this.paintScaleAndTime(divideDate, divideX, step, false);
  }

  /**
   * 循环绘制刻度尺和时间
   * @param divideDate 传入的分割点的时间
   * @param divideX 传入的分割点的坐标
   * @param step 绘制刻度线时的步幅
   * @param isReverse 绘制时是否是倒序绘制
   */
  private paintScaleAndTime(divideDate: Date, divideX: number, step: Step, isReverse: boolean): void {
    const shortLine = 0.6 * this.scaleLineHeight;
    let [count, textInterval] = [0, 0];
    let date = new Date(divideDate.getTime());
    while (true) {
      if (isReverse) {
        divideX -= step.pxPerStep;
        date = new Date(date.getTime() - this.curStepMin * 60 * 1000);
      } else {
        divideX += step.pxPerStep;
        date = new Date(date.getTime() + this.curStepMin * 60 * 1000);
      }
      if (divideX < 0 || divideX > this.canvas.width) {
        break;
      }
      if (count + 1 < step.interval) {
        this.drawLine(divideX, 0, divideX, shortLine, this.textColor);
      } else {
        this.drawLine(divideX, 0, divideX, this.scaleLineHeight, this.textColor);
        textInterval += step.interval * step.pxPerStep;
        if (textInterval >= this.minimumTextInterval) {
          this.ctx.fillStyle = this.textColor;
          this.ctx.fillText(this.formatDate(date), divideX - this.textOffset, this.textPaddingTop);
          textInterval = 0;
        }
      }
      count = count + 1 === step.interval ? 0 : count + 1;
    }
  }

  /** 绘制跟随鼠标的指示线 */
  private paintIndicatorLine(x: number): void {
    this.drawLine(x, 0, x, this.canvas.height, 'white', 0.5);
  }

  /** 根据当前分钟，返回适合他的步幅列表 */
  private getStepsByStepMin(stepMin: number): Step | null {
    // 如果是一天的分钟数量，则返回最大步幅
    if (stepMin === 1440) {
      return this.steps[this.steps.length - 1];
    }
    let rightStep = null;
    for (const step of this.steps) {
      // 除数，通过此步幅的间隔数和当前步幅分钟的乘积决定
      const divisor = step.interval * stepMin;
      let [dividend, isTrue] = [0, false];
      // 时间节点列表里，如果刚好比除数大或者相等的那个数满足条件，则可以
      for (const min of this.minuteNodes) {
        if (min >= divisor) {
          dividend = min;
          break;
        }
      }
      if (dividend !== 0 && dividend % divisor === 0) {
        isTrue = true;
      }
      if (isTrue) {
        rightStep = step;
        break;
      }
    }
    return rightStep;
  }

  /** 清空画布，只保留背景 */
  private clearCanvas(): void {
    if(this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.initBackground();
  }

  //#region 动作工具函数
  /** 绘制线段 */
  private drawLine(startX: number, startY: number, endX: number, endY: number, color: string, width = 1): void {
    if(this.ctx) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = width;
      this.ctx.stroke();
    }
  }

  /** 绘制倒等腰直角三角形 */
  private drawInvertedTriangle(startX: number, startY: number, height: number, color: string): void {
    if(this.ctx) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX - height, startY);
      this.ctx.lineTo(startX, height);
      this.ctx.lineTo(startX + height, startY);
      this.ctx.fillStyle = color;
      this.ctx.fill();
    }
  }

  /** 把日期格式化为合适的显示状态 */
  private formatDate(date: Date): string {
    const smallerThanDay = this.curStepMin <= this.minuteNodes[0];
    if (smallerThanDay) {
      // 返回 hh:ss
      return date.toTimeString().slice(0, 5);
    } else {
      // 返回几月几日
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  }

  /** 把日期格式化为标准时间 */
  // private static transDateToYMD(date: Date): string {
  //   const y = date.getFullYear().toString();
  //   const m = (date.getMonth() + 1).toString();
  //   const d = date.getDate().toString();
  //   const strM = m.length < 2 ? `0${m}` : m;
  //   const strD = d.length < 2 ? `0${d}` : d;
  //   const time = date.toTimeString().split(' ')[0];
  //   return `${y}-${strM}-${strD} ${time}`;
  // }

  //#endregion

  /** 设置开始时间 */
  setMiddleTime(midDate: Date): void {
    this.curTime = midDate;
    this.repaintCanvas(midDate);
  }

  /** 设置可高亮的时间段数组 */
  setTimeList(timeSlotList: TimeSlot[], bgColor?: string): void {
    this.timeList = timeSlotList;
    this.timeListBgColor = bgColor ? bgColor : this.timeListBgColor;
    this.repaintCanvas(this.curTime);
  }

  /** 设置步幅时间 */
  setStepMin(num: StepMin): void {
    this.curStepMin = num;
  }

  /** 解除各类事件监听 */
  destroy(): void {
    if(this.canvas) {
      this.canvas.removeEventListener('mousedown', this.mousedownEvent);
      this.canvas.removeEventListener('mouseup', this.mouseupEvent);
      this.canvas.removeEventListener('mouseout', this.mouseoutEvent);
      this.canvas.removeEventListener('mousemove', this.mousemoveEvent);
      this.canvas.removeEventListener('wheel', this.wheelEvent);
    }
  }
}

// const timeList: TimeSlot[] = [
//   {
//     startTime: new Date(Date.now() - 3 * 3600 * 1000),
//     endTime: new Date(Date.now() - 3600 * 1000),
//   },
//   {
//     startTime: new Date(Date.now() + 3600 * 1000),
//     endTime: new Date(Date.now() + 6 * 3600 * 1000),
//     bgColor: 'rgba(255, 1, 1, 0.6)',
//   },
// ];
// const canvas: HTMLCanvasElement = document.querySelector('.canvas');
// const timeLine = new TimeLine(canvas);
// timeLine.setMiddleTime(new Date());
// timeLine.setTimeList(timeList);
