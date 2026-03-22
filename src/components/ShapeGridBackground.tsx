import { useEffect, useRef } from "react";

export function ShapeGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SQUARE_SIZE = 40;
    const SPEED = 0.4;
    const BORDER_COLOR = "rgba(236, 72, 153, 0.1)";
    const FILL_COLOR = "rgba(236, 72, 153, 0.08)";
    let offsetX = 0;
    let offsetY = 0;
    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Move diagonally
      offsetX = (offsetX + SPEED) % SQUARE_SIZE;
      offsetY = (offsetY + SPEED) % SQUARE_SIZE;

      ctx.clearRect(0, 0, w, h);

      const cols = Math.ceil(w / SQUARE_SIZE) + 2;
      const rows = Math.ceil(h / SQUARE_SIZE) + 2;

      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          const x = col * SQUARE_SIZE + offsetX - SQUARE_SIZE;
          const y = row * SQUARE_SIZE + offsetY - SQUARE_SIZE;

          // Subtle diagonal wave fill
          const wave = Math.sin((col + row) * 0.4 + (offsetX + offsetY) * 0.02) * 0.5 + 0.5;
          if (wave > 0.6) {
            ctx.fillStyle = FILL_COLOR;
            ctx.globalAlpha = (wave - 0.6) * 2;
            ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
            ctx.globalAlpha = 1;
          }

          ctx.strokeStyle = BORDER_COLOR;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x + 0.5, y + 0.5, SQUARE_SIZE, SQUARE_SIZE);
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ background: "#070510" }}
    />
  );
}