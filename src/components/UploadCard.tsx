import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';

interface UploadCardProps {
  label: string;
  accept?: string;
  capture?: string;
  onChange: (file: File, previewUrl: string) => void;
  onClear?: () => void;
  previewUrl?: string;
}

export const UploadCard: React.FC<UploadCardProps> = ({ label, accept = 'image/*', capture, onChange, onClear, previewUrl }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange(file, String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card className={`transition-smooth ${dragOver ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-md p-6 text-center cursor-pointer"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            handleFile(file);
          }}
          role="button"
          aria-label={label}
        >
          {previewUrl ? (
            <img src={previewUrl} alt={`${label} preview`} className="max-h-60 w-full object-contain rounded-md" loading="lazy" />
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">{label}</div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            capture={capture as any}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {previewUrl && onClear && (
            <Button type="button" variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onClear(); }}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
