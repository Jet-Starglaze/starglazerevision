"use client";

import { useEffect, useRef } from "react";

type Point = {
  x: number;
  y: number;
};

const MAX_POINTS = 18;
const MAX_TRAIL_LENGTH = 145;
const FOLLOW_EASING = 0.24;
const MIN_POINT_DISTANCE = 3;
const IDLE_FADE_DELAY_MS = 110;
const FADE_INTERVAL_MS = 34;

export default function MouseTrail() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const supportsFinePointer = window.matchMedia("(pointer: fine)").matches;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!supportsFinePointer || prefersReducedMotion) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const pointer = {
      currentX: window.innerWidth / 2,
      currentY: window.innerHeight / 2,
      targetX: window.innerWidth / 2,
      targetY: window.innerHeight / 2,
      lastMoveAt: 0,
      lastFadeAt: 0,
      visible: false,
    };

    const points: Point[] = [];
    let animationFrame = 0;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const trimTrail = () => {
      while (points.length > MAX_POINTS) {
        points.shift();
      }

      let length = 0;

      for (let index = points.length - 1; index > 0; index -= 1) {
        const start = points[index];
        const end = points[index - 1];

        length += Math.hypot(start.x - end.x, start.y - end.y);

        if (length > MAX_TRAIL_LENGTH) {
          points.splice(0, index - 1);
          break;
        }
      }
    };

    const drawTrail = () => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);

      if (points.length < 2) {
        return;
      }

      for (let index = 1; index < points.length; index += 1) {
        const previousPoint = points[index - 1];
        const point = points[index];
        const progress = index / (points.length - 1);
        const alpha = 0.08 + progress * 0.62;

        context.beginPath();
        context.moveTo(previousPoint.x, previousPoint.y);
        context.lineTo(point.x, point.y);
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = 1 + progress * 2.1;
        context.strokeStyle = `rgba(249, 115, 22, ${alpha})`;
        context.stroke();
      }

      const head = points[points.length - 1];

      context.beginPath();
      context.arc(head.x, head.y, 1.7, 0, Math.PI * 2);
      context.fillStyle = "rgba(251, 146, 60, 0.95)";
      context.fill();
    };

    const step = () => {
      pointer.currentX += (pointer.targetX - pointer.currentX) * FOLLOW_EASING;
      pointer.currentY += (pointer.targetY - pointer.currentY) * FOLLOW_EASING;

      const lastPoint = points[points.length - 1];
      const hasMovedEnough =
        !lastPoint ||
        Math.hypot(
          pointer.currentX - lastPoint.x,
          pointer.currentY - lastPoint.y,
        ) >= MIN_POINT_DISTANCE;

      if (pointer.visible && hasMovedEnough) {
        points.push({ x: pointer.currentX, y: pointer.currentY });
        trimTrail();
      }

      const now = Date.now();

      if (
        now - pointer.lastMoveAt > IDLE_FADE_DELAY_MS &&
        now - pointer.lastFadeAt > FADE_INTERVAL_MS &&
        points.length
      ) {
        points.shift();
        pointer.lastFadeAt = now;
      }

      drawTrail();
      animationFrame = window.requestAnimationFrame(step);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") {
        return;
      }

      pointer.targetX = event.clientX;
      pointer.targetY = event.clientY;
      pointer.lastMoveAt = Date.now();
      pointer.lastFadeAt = pointer.lastMoveAt;

      if (!pointer.visible) {
        pointer.currentX = event.clientX;
        pointer.currentY = event.clientY;
        pointer.visible = true;
      }
    };

    const handlePointerLeave = () => {
      pointer.visible = false;
      pointer.lastMoveAt = 0;
      pointer.lastFadeAt = 0;
    };

    resizeCanvas();
    animationFrame = window.requestAnimationFrame(step);

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);
    document.addEventListener("mouseleave", handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("mouseleave", handlePointerLeave);
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50"
      ref={canvasRef}
    />
  );
}
