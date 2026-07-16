"use client";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/Button";

interface Props {
  imageUrl: string;
  x: number;
  y: number;
  label: string;
}

export function MapViewer({ imageUrl, x, y, label }: Props) {
  return (
    <TransformWrapper initialScale={1} minScale={0.5} maxScale={8} centerOnInit>
      {({ zoomIn, zoomOut, resetTransform }) => (
        <div>
          <div className="mb-2 flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => zoomIn()}>
              Zoom in
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => zoomOut()}>
              Zoom out
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => resetTransform()}>
              Reset
            </Button>
          </div>
          <TransformComponent
            wrapperStyle={{
              width: "100%",
              height: "78vh",
              background: "#f1f5f9",
              borderRadius: "0.5rem",
              border: "1px solid #e2e8f0",
            }}
            contentClass="!w-full"
          >
            <div className="relative w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={label} className="block w-full" />
              <div
                className="absolute -translate-x-1/2 -translate-y-full"
                style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
              >
                <span className="relative flex flex-col items-center">
                  <span className="mb-0.5 whitespace-nowrap rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold text-white shadow">
                    {label}
                  </span>
                  <span className="relative flex h-5 w-5 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <svg
                      className="relative text-red-600"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
                    </svg>
                  </span>
                </span>
              </div>
            </div>
          </TransformComponent>
        </div>
      )}
    </TransformWrapper>
  );
}
