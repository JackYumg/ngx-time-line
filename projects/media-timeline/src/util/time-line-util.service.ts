import { Injectable } from '@angular/core';

@Injectable()
export class TimeLineUtilService {

  constructor() { }

  drawLine(startX: number, startY: number, endX: number, endY: number, color: string, width = 1, ctx: CanvasRenderingContext2D): void {
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  drawInvertedTriangle(startX: number, startY: number, height: number, color: string, ctx: CanvasRenderingContext2D): void {
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(startX - height, startY);
      ctx.lineTo(startX, height);
      ctx.lineTo(startX + height, startY);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

}
