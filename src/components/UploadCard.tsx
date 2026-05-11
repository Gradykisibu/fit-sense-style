import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Camera, ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { validateImageFile } from '@/lib/uploads';

interface UploadCardProps {
  label: string;
  accept?: string;
  /** @deprecated kept for backward compat; new UI exposes both camera and gallery buttons. */
  capture?: string;
  onChange: (file: File, previewUrl: string) => void;
  onClear?: () => void;
  previewUrl?: string;
}

export const UploadCard: React.FC<UploadCardProps> = ({ label, accept = 'image/*', onChange, onClear, previewUrl }) => {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const handleFile = (file?: File) => {
    if (!file) return;
    const v = validateImageFile(file);
    if (v.ok !== true) {
      toast({ title: 'Invalid image', description: v.reason, variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(file, String(reader.result));
    reader.onerror = () => toast({ title: 'Upload failed', description: 'Could not read file.', variant: 'destructive' });
    reader.readAsDataURL(file);
  };

  return (
    <Card className={`transition-smooth ${dragOver ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-3 sm:p-4 space-y-3">
        <div
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-md p-4 sm:p-6 text-center"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          aria-label={label}
        >
          {previewUrl ? (
            <img src={previewUrl} alt={`${label} preview`} className="max-h-72 w-full object-contain rounded-md" loading="lazy" />
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm text-muted-foreground px-2">{label}</div>
              <div className="hidden sm:block text-xs text-muted-foreground">or drag &amp; drop an image here</div>
            </>
          )}
        </div>

        <input
          ref={galleryRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept={accept}
          capture="environment"
          className="hidden"
          onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
        />

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="default"
            className="w-full sm:flex-1 min-h-11"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="h-4 w-4 mr-2" /> Take Photo
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:flex-1 min-h-11"
            onClick={() => galleryRef.current?.click()}
          >
            <ImageIcon className="h-4 w-4 mr-2" /> Choose from Gallery
          </Button>
          {previewUrl && onClear && (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto min-h-11"
              onClick={onClear}
            >
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
