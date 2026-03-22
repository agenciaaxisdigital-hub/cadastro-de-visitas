import { useEffect, useRef, useCallback } from "react";

export function ShapeGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1, y: -1 });
  const squaresRef = useRef<{ opacity: number; targetOpacity: number }[]>([]);

  const SQUARE_SIZE = 40;
  const BORDER_COLOR = "rgba(236, 72, 153, 0.12)";
  const HOVER_COLOR = "rgba(236, 72, 153, 0.15)";
  const TRAIL_DECAY = 0.03;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cols = Math.ceil(w / SQUARE_SIZE) + 1;
    const rows = Math.ceil(h / SQUARE_SIZE) + 1;
    const total = cols * rows;

    // Initialize squares if needed
    if (squaresRef.current.length !== total) {
      squaresRef.current = Array.from({ length: total }, () => ({
        opacity: 0,
        targetOpacity: 0,
      }));
    }

    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;

    // Update target opacities based on mouse
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const cx = col * SQUARE_SIZE + SQUARE_SIZE / 2;
        const cy = row * SQUARE_SIZE + SQUARE_SIZE / 2;
        const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);

        if (dist < SQUARE_SIZE * 1.5 && mx >= 0) {
          squaresRef.current[idx].targetOpacity = 1;
        } else {
          squaresRef.current[idx].targetOpacity = 0;
        }
      }
    }

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Draw grid
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const x = col * SQUARE_SIZE;
        const y = row * SQUARE_SIZE;
        const sq = squaresRef.current[idx];

        // Animate opacity
        if (sq.opacity < sq.targetOpacity) {
          sq.opacity = Math.min(sq.opacity + 0.08, sq.targetOpacity);
        } else if (sq.opacity > sq.targetOpacity) {
          sq.opacity = Math.max(sq.opacity - TRAIL_DECAY, 0);
        }

        // Fill hover
        if (sq.opacity > 0.01) {
          ctx.fillStyle = HOVER_COLOR;
          ctx.globalAlpha = sq.opacity;
          ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
          ctx.globalAlpha = 1;
        }

        // Border
        ctx.strokeStyle = BORDER_COLOR;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 0.5, y + 0.5, SQUARE_SIZE, SQUARE_SIZE);
      }
    }

    requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      squaresRef.current = [];
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleLeave = () => {
      mouseRef.current = { x: -1, y: -1 };
    };
    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    canvas.addEventListener("mousemove", handleMouse);
    canvas.addEventListener("mouseleave", handleLeave);
    canvas.addEventListener("touchmove", handleTouch);
    canvas.addEventListener("touchend", handleLeave);

    const id = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouse);
      canvas.removeEventListener("mouseleave", handleLeave);
      canvas.removeEventListener("touchmove", handleTouch);
      canvas.removeEventListener("touchend", handleLeave);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ background: "#070510" }}
    />
  );
}
