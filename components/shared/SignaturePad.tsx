"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { UploadCloud } from "lucide-react";

export default function SignaturePad({ onSave, themeColor = "var(--primary-theme)" }: { onSave: (file: File | null) => void; themeColor?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [isUploadedSignature, setIsUploadedSignature] = React.useState(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isUploadedSignature) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const offsetX = (clientX - rect.left) * scaleX;
    const offsetY = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isUploadedSignature || !isDrawing) return;
    e.preventDefault(); // Prevent scrolling while signing on touch devices
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const offsetX = (clientX - rect.left) * scaleX;
    const offsetY = (clientY - rect.top) * scaleY;

    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsUploadedSignature(false);
  };

  const handleSave = () => {
    if (isUploadedSignature) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return onSave(null);
      onSave(new File([blob], `signature-${Date.now()}.png`, { type: "image/png" }));
    }, "image/png", 0.92);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShift_x = (canvas.width - img.width * ratio) / 2;
        const centerShift_y = (canvas.height - img.height * ratio) / 2;
        ctx.drawImage(img, 0, 0, img.width, img.height,
          centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);

        canvas.toBlob((blob) => {
          if (!blob) return onSave(null);
          setIsUploadedSignature(true);
          onSave(new File([blob], `signature-${Date.now()}.png`, { type: "image/png" }));
        }, "image/png", 0.92);
      }
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col items-center w-full">
      <canvas
        ref={canvasRef}
        width={800}
        height={250}
        className={cn(
          "w-full h-[250px] cursor-crosshair touch-none transition-all",
          isUploadedSignature && "pointer-events-none opacity-80"
        )}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="p-4 bg-slate-50 dark:bg-black/40 w-full flex justify-center gap-4 border-t border-slate-200 dark:border-white/10 flex-wrap">
        <button onClick={clearCanvas} className="px-6 py-2 rounded-full border border-slate-300 dark:border-white/20 text-slate-600 dark:text-slate-300 text-sm font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          Clear
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2 rounded-full border border-blue-300 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
          <UploadCloud className="w-4 h-4" />
          Upload E-Signature
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        <button
          onClick={handleSave}
          disabled={isUploadedSignature}
          className={cn(
            "px-6 py-2 rounded-full text-white text-sm font-bold flex items-center gap-2 shadow-md transition-all hover:opacity-90",
            isUploadedSignature && "opacity-50 cursor-not-allowed"
          )}
          style={!isUploadedSignature ? { backgroundColor: themeColor } : undefined}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
          Save Signature
        </button>
      </div>
    </div>
  );
}
