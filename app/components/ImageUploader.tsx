"use client";

import React, { useRef } from "react";
import { Upload, X } from "lucide-react";

export type UploadedImage = {
  id: string;
  name: string;
  dataUrl: string;
  mediaType: string;
  base64: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).slice((reader.result as string).indexOf(",") + 1));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type Props = {
  images: UploadedImage[];
  setImages: (images: UploadedImage[]) => void;
};

export default function ImageUploader({ images, setImages }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList) {
    const files = Array.from(fileList);
    const newImages: UploadedImage[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const base64 = await fileToBase64(file);
      newImages.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        name: file.name,
        dataUrl: `data:${file.type};base64,${base64}`,
        mediaType: file.type,
        base64,
      });
    }
    setImages([...images, ...newImages]);
  }

  function removeImage(id: string) {
    setImages(images.filter((img) => img.id !== id));
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4">
      <h2 className="text-sm font-semibold text-slate-800 mb-2">画像</h2>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full border-2 border-dashed border-slate-300 rounded-lg py-6 flex flex-col items-center gap-2 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
      >
        <Upload size={22} />
        <span className="text-sm">タップして画像を追加(1枚〜複数枚)</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {images.map((img) => (
            <div key={img.id} className="relative rounded-lg overflow-hidden border border-zinc-200 aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(img.id)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                aria-label="画像を削除"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
