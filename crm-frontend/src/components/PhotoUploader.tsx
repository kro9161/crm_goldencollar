import { useRef, useState } from "react";

type PhotoUploaderProps = {
  onUpload: (url: string) => void;
};

export default function PhotoUploader({ onUpload }: PhotoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Le fichier doit être une image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setPreview(url);
      setError("");
      onUpload(url);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div
      className="w-24 h-24 flex items-center justify-center border-2 border-dashed border-primary rounded-full bg-gray-50 cursor-pointer hover:bg-gray-100 transition relative"
      onClick={() => inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={e => e.preventDefault()}
      title="Glissez-déposez ou cliquez pour choisir une photo"
    >
      {preview ? (
        <img src={preview} alt="Aperçu" className="object-cover w-full h-full rounded-full" />
      ) : (
        <span className="text-3xl text-gray-400">📷</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
      />
      {error && <span className="absolute -bottom-6 left-0 right-0 text-xs text-red-500 text-center">{error}</span>}
    </div>
  );
}
