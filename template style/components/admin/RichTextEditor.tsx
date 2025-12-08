"use client";

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Image as ImageIcon, X, Link as LinkIcon } from 'lucide-react';
import { InlineImage } from '@/types';

interface RichTextEditorProps {
  content: string;
  inlineImages?: InlineImage[];
  onChange: (content: string, images: InlineImage[]) => void;
  onImageUpload: (file: File) => Promise<{ url: string; s3_key: string }>;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  content,
  inlineImages = [],
  onChange,
  onImageUpload,
  placeholder = "Write your content here...",
  className = "",
  minHeight = "200px"
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const isUserInputRef = useRef(false);
  const lastContentRef = useRef<string>('');
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    const currentTextContent = editor.textContent || '';
    const currentInnerHTML = editor.innerHTML || '';
    
    if (isInitialMountRef.current) {
      if (content) {
        if (content.includes('<a ') || content.includes('</a>')) {
          editor.innerHTML = content;
        } else if (currentTextContent !== content) {
          editor.textContent = content;
        }
      }
      isInitialMountRef.current = false;
      lastContentRef.current = content;
    } else if (!isUserInputRef.current && content !== lastContentRef.current) {
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      const hadFocus = document.activeElement === editor;
      
      if (content.includes('<a ') || content.includes('</a>')) {
        if (currentInnerHTML !== content) {
          editor.innerHTML = content;
        }
      } else if (content !== currentTextContent) {
        const links = editor.querySelectorAll('a');
        if (links.length > 0) {
          const tempDiv = document.createElement('div');
          tempDiv.textContent = content;
          const textNodes = Array.from(tempDiv.childNodes);
          links.forEach((link, index) => {
            if (textNodes[index]) {
              link.textContent = textNodes[index].textContent || link.textContent;
            }
          });
        } else {
          editor.textContent = content;
        }
      }
      
      if (hadFocus && range && editor.contains(range.commonAncestorContainer)) {
        try {
          selection?.removeAllRanges();
          selection?.addRange(range);
        } catch (e) {
        }
      }
      
      lastContentRef.current = content;
    }
    
    inlineImages.forEach((imgData) => {
      const existing = editor.querySelector(`img[data-image-id="${imgData.id}"]`);
      if (!existing) {
        const img = document.createElement('img');
        img.src = imgData.url;
        img.dataset.imageId = imgData.id;
        img.className = 'inline-image max-w-full rounded-lg my-2 cursor-pointer';
        img.style.maxWidth = `${imgData.width || 400}px`;
        img.draggable = false;
        img.contentEditable = 'false';
        
        img.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedImageId(imgData.id);
        });
        
        const br = document.createElement('br');
        editor.appendChild(br);
        editor.appendChild(img);
      } else {
        (existing as HTMLImageElement).style.maxWidth = `${imgData.width || 400}px`;
      }
    });
  }, [content, inlineImages]);

  const insertImage = async (file: File) => {
    setUploading(true);
    try {
      const result = await onImageUpload(file);
      const imageId = `img-${Date.now()}`;
      
      const newImage: InlineImage = {
        id: imageId,
        url: result.url,
        s3Key: result.s3_key,
        width: 400
      };

      if (editorRef.current) {
        const selection = window.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        
        const img = document.createElement('img');
        img.src = result.url;
        img.dataset.imageId = imageId;
        img.className = 'inline-image max-w-full rounded-lg my-2 cursor-pointer';
        img.style.maxWidth = '400px';
        img.draggable = false;
        img.contentEditable = 'false';
        
        img.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedImageId(imageId);
        });

        if (range && editorRef.current.contains(range.commonAncestorContainer)) {
          range.insertNode(img);
          const br = document.createElement('br');
          range.insertNode(br);
          range.setStartAfter(br);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        } else {
          editorRef.current.appendChild(img);
          const br = document.createElement('br');
          editorRef.current.appendChild(br);
        }
      }

      const updatedImages = [...inlineImages, newImage];
      const updatedContent = editorRef.current?.innerHTML || '';
      onChange(updatedContent, updatedImages);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    
    isUserInputRef.current = true;
    
    const editor = editorRef.current;
    const images: InlineImage[] = [];
    
    editor.querySelectorAll('img[data-image-id]').forEach((imgEl) => {
      const imageId = imgEl.getAttribute('data-image-id');
      if (imageId) {
        const existingImage = inlineImages.find(img => img.id === imageId);
        if (existingImage) {
          const width = parseInt((imgEl as HTMLImageElement).style.maxWidth) || existingImage.width || 400;
          images.push({ ...existingImage, width });
        }
      }
    });
    
    const contentWithLinks = editor.innerHTML;
    const textContent = editor.textContent || '';
    
    lastContentRef.current = contentWithLinks;
    onChange(contentWithLinks, images);
    
    requestAnimationFrame(() => {
      isUserInputRef.current = false;
    });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    isUserInputRef.current = true;
    
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          insertImage(file);
        }
        return;
      }
    }
    
    const text = e.clipboardData.getData('text/plain');
    if (text && editorRef.current) {
      const selection = window.getSelection();
      if (selection?.rangeCount) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      handleInput();
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      await insertImage(files[0]);
    }
  };

  const removeImage = (imageId: string) => {
    if (editorRef.current) {
      const img = editorRef.current.querySelector(`img[data-image-id="${imageId}"]`);
      if (img) {
        img.remove();
        handleInput();
      }
    }
    setSelectedImageId(null);
  };

  const handleCreateLink = () => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();

    if (!selectedText) {
      alert('Please select some text to create a link');
      return;
    }

    setSelectedText(selectedText);
    setLinkUrl('');
    setShowLinkDialog(true);
  };

  const applyLink = () => {
    if (!editorRef.current || !linkUrl.trim()) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    
    try {
      const link = document.createElement('a');
      link.href = linkUrl.trim();
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = selectedText || linkUrl;
      link.className = 'text-primary underline hover:text-primary/80';

      range.deleteContents();
      range.insertNode(link);
      
      const newRange = document.createRange();
      newRange.setStartAfter(link);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);

      handleInput();
      setShowLinkDialog(false);
      setLinkUrl('');
      setSelectedText('');
    } catch (error) {
      console.error('Error creating link:', error);
      alert('Failed to create link');
    }
  };

  const removeLink = () => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const link = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? (range.commonAncestorContainer.parentElement?.closest('a') as HTMLAnchorElement)
      : (range.commonAncestorContainer as Element).closest('a') as HTMLAnchorElement;

    if (link) {
      const parent = link.parentNode;
      if (parent) {
        while (link.firstChild) {
          parent.insertBefore(link.firstChild, link);
        }
        parent.removeChild(link);
        handleInput();
      }
    }
  };


  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`min-h-[${minHeight}] outline-none focus:ring-0 ${className}`}
        style={{ minHeight }}
        data-placeholder={placeholder}
      />
      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
      
      <div className="mt-2 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              insertImage(file);
              e.target.value = '';
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-8"
        >
          <ImageIcon className="w-3 h-3 mr-1" />
          {uploading ? 'Uploading...' : 'Add Image'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCreateLink}
          className="h-8"
        >
          <LinkIcon className="w-3 h-3 mr-1" />
          Add Link
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={removeLink}
          className="h-8"
        >
          <X className="w-3 h-3 mr-1" />
          Remove Link
        </Button>
      </div>

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Link</DialogTitle>
            <DialogDescription>
              Enter the URL for the selected text: "{selectedText}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLink();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={applyLink} disabled={!linkUrl.trim()}>
              Create Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedImageId && (() => {
        const img = inlineImages.find(i => i.id === selectedImageId);
        if (!img) return null;
        return (
          <div className="mt-2 p-2 bg-muted rounded-lg flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Width:</span>
            <input
              type="range"
              min="200"
              max="800"
              value={img.width || 400}
              onChange={(e) => {
                const newWidth = parseInt(e.target.value);
                const updatedImages = inlineImages.map(i =>
                  i.id === selectedImageId ? { ...i, width: newWidth } : i
                );
                
                if (editorRef.current) {
                  const imgEl = editorRef.current.querySelector(`img[data-image-id="${selectedImageId}"]`) as HTMLImageElement;
                  if (imgEl) {
                    imgEl.style.maxWidth = `${newWidth}px`;
                  }
                }
                
                onChange(content, updatedImages);
              }}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-16">{img.width || 400}px</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeImage(selectedImageId)}
              className="h-8 w-8 p-0 text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        );
      })()}
    </div>
  );
}

