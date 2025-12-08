'use client';

import { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/ui/use-toast';
import { ClipizyLogo } from '@/components/common/clipizy-logo';
import { Download, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type BackgroundOption = 'white' | 'black' | 'none';

export default function AdminLogoPage() {
  const [size, setSize] = useState(512);
  const [background, setBackground] = useState<BackgroundOption>('white');
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();
  const logoRef = useRef<HTMLDivElement>(null);

  const convertImageToPNG = async (
    width: number,
    height: number,
    bgOption: BackgroundOption
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const imgElement = logoRef.current?.querySelector(
        'img'
      ) as HTMLImageElement;

      const getImageSrc = (): string => {
        if (imgElement) {
          return (
            imgElement.src ||
            imgElement.currentSrc ||
            imgElement.getAttribute('src') ||
            '/logo.png'
          );
        }
        return '/logo.png';
      };

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        if (bgOption !== 'none') {
          ctx.fillStyle = bgOption === 'white' ? '#ffffff' : '#000000';
          ctx.fillRect(0, 0, width, height);
        }

        const logoSize = Math.min(width, height) * 0.8;
        const x = (width - logoSize) / 2;
        const y = (height - logoSize) / 2;

        ctx.drawImage(img, x, y, logoSize, logoSize);

        const pngDataUrl = canvas.toDataURL('image/png');
        resolve(pngDataUrl);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = getImageSrc();
    });
  };

  const downloadLogo = async () => {
    setDownloading(true);
    try {
      const pngDataUrl = await convertImageToPNG(size, size, background);

      const link = document.createElement('a');
      const bgSuffix = background === 'none' ? 'transparent' : background;
      link.href = pngDataUrl;
      link.download = `clipizy-logo-${size}x${size}-${bgSuffix}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Success',
        description: `Logo downloaded as ${size}x${size} PNG with ${background === 'none' ? 'transparent' : background} background`,
      });
    } catch (error: any) {
      console.error('Error downloading logo:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to download logo',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const predefinedSizes = [
    { label: 'Small (256x256)', value: 256 },
    { label: 'Medium (512x512)', value: 512 },
    { label: 'Large (1024x1024)', value: 1024 },
    { label: 'Extra Large (2048x2048)', value: 2048 },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Logo Download</h1>
        <p className="text-muted-foreground mt-2">
          Download the Clipizy logo as a PNG image in various sizes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Preview of the logo that will be downloaded
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`flex items-center justify-center p-8 rounded-lg border-2 border-dashed ${
                background === 'white'
                  ? 'bg-white'
                  : background === 'black'
                    ? 'bg-black'
                    : 'bg-gray-50'
              }`}
              style={
                background === 'none'
                  ? {
                      backgroundImage:
                        'repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 20px 20px',
                    }
                  : {}
              }
            >
              <div ref={logoRef} className="flex items-center justify-center">
                <ClipizyLogo
                  className="w-auto h-auto"
                  style={{
                    width: `${Math.min(size / 4, 256)}px`,
                    height: `${Math.min(size / 4, 256)}px`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Download Options</CardTitle>
            <CardDescription>
              Configure the logo size and download
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Size (px)</Label>
              <Input
                type="number"
                min="64"
                max="4096"
                step="64"
                value={size}
                onChange={e =>
                  setSize(
                    Math.max(
                      64,
                      Math.min(4096, parseInt(e.target.value) || 512)
                    )
                  )
                }
                placeholder="512"
              />
              <p className="text-xs text-muted-foreground">
                Enter a size between 64 and 4096 pixels
              </p>
            </div>

            <div className="space-y-2">
              <Label>Quick Size Selection</Label>
              <div className="grid grid-cols-2 gap-2">
                {predefinedSizes.map(preset => (
                  <Button
                    key={preset.value}
                    variant={size === preset.value ? 'default' : 'outline'}
                    onClick={() => setSize(preset.value)}
                    className="w-full"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Background</Label>
              <RadioGroup
                value={background}
                onValueChange={value =>
                  setBackground(value as BackgroundOption)
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="white" id="bg-white" />
                  <Label
                    htmlFor="bg-white"
                    className="font-normal cursor-pointer"
                  >
                    White
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="black" id="bg-black" />
                  <Label
                    htmlFor="bg-black"
                    className="font-normal cursor-pointer"
                  >
                    Black
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="bg-none" />
                  <Label
                    htmlFor="bg-none"
                    className="font-normal cursor-pointer"
                  >
                    Transparent (None)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={downloadLogo}
                disabled={downloading}
                className="w-full"
                size="lg"
              >
                {downloading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download PNG ({size}x{size})
                  </>
                )}
              </Button>
            </div>

            <div className="pt-4 border-t space-y-2">
              <p className="text-sm font-medium">File Information</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Format: PNG</p>
                <p>
                  Dimensions: {size} × {size} pixels
                </p>
                <p>
                  Background:{' '}
                  {background === 'none'
                    ? 'Transparent'
                    : background.charAt(0).toUpperCase() + background.slice(1)}
                </p>
                <p>Format: RGB{background === 'none' ? 'A' : ''}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
