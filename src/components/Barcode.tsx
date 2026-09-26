import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  className?: string;
  displayValue?: boolean;
  height?: number;
  width?: number;
}

export const Barcode: React.FC<BarcodeProps> = ({ 
  value, 
  className,
  displayValue = true,
  height = 50,
  width = 1.8
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: 'CODE128',
          displayValue,
          fontSize: 14,
          height,
          width,
          margin: 6,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (err) {
        console.warn("JsBarcode render error:", err);
      }
    }
  }, [value, displayValue, height, width]);

  return <canvas ref={canvasRef} className={className} />;
};
