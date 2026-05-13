"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const [error, setError] = useState("");

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        onScan(decodedText);
      },
      (err) => {
        // Only show actual errors, not just "not found yet"
        if (typeof err === "string" && !err.includes("NotFound")) {
          console.warn(err);
        }
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white overflow-hidden shadow-2xl relative">
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <h3 className="font-bold">Scan Barcode</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white font-bold text-xl leading-none">&times;</button>
        </div>
        <div className="p-4 bg-slate-100">
          <div id="reader" className="w-full rounded-xl overflow-hidden border-2 border-emerald-500 shadow-inner bg-white"></div>
          {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
          <p className="text-xs text-center text-slate-500 mt-4">Point your camera at the barcode. Ensure good lighting.</p>
        </div>
      </div>
    </div>
  );
}
