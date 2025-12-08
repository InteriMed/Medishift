"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Image as ImageIcon, Trash2, GripVertical, Plus, Type, Columns as ColumnsIcon, Table as TableIcon, X } from 'lucide-react';
import { ContentBlock, ColumnContent, InlineImage } from '@/types';
import { RichTextEditor } from './RichTextEditor';

interface BlogEditorProps {
  content: string;
  contentLayout: ContentBlock[];
  onContentChange: (content: string) => void;
  onLayoutChange: (layout: ContentBlock[]) => void;
  onImageUpload: (file: File) => Promise<{ url: string; s3_key: string }>;
  showPreview?: boolean;
}

export function BlogEditor({
  content,
  contentLayout,
  onContentChange,
  onLayoutChange,
  onImageUpload,
  showPreview = false
}: BlogEditorProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    if (contentLayout && contentLayout.length > 0) {
      return contentLayout.sort((a, b) => a.order - b.order);
    }
    return [{
      id: 'block-0',
      type: 'text',
      content: content || '',
      order: 0
    }];
  });
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [uploadingColumnId, setUploadingColumnId] = useState<string | null>(null);

  useEffect(() => {
    const textBlocks = blocks.filter(b => b.type === 'text');
    const combinedContent = textBlocks.map(b => b.content).join('\n\n');
    onContentChange(combinedContent);
    
    const reorderedBlocks = blocks.map((block, index) => ({
      ...block,
      order: index
    }));
    onLayoutChange(reorderedBlocks);
  }, [blocks]);

  const addBlock = (type: 'text' | 'heading', afterIndex: number) => {
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}`,
      type,
      content: type === 'heading' ? 'New Section Title' : '',
      order: afterIndex + 1
    };
    
    const newBlocks = [...blocks];
    newBlocks.splice(afterIndex + 1, 0, newBlock);
    setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })));
  };

  const addColumnsBlock = (columnCount: 2 | 3, afterIndex: number) => {
    const columns: ColumnContent[] = Array.from({ length: columnCount }, (_, i) => ({
      id: `col-${Date.now()}-${i}`,
      type: 'text' as const,
      content: ''
    }));

    const newBlock: ContentBlock = {
      id: `block-${Date.now()}`,
      type: 'columns',
      content: '',
      columnCount,
      columns,
      order: afterIndex + 1
    };
    
    const newBlocks = [...blocks];
    newBlocks.splice(afterIndex + 1, 0, newBlock);
    setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })));
  };

  const addTableBlock = (afterIndex: number) => {
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}`,
      type: 'table',
      content: '',
      tableHeaders: ['Column 1', 'Column 2', 'Column 3'],
      tableData: [
        [{ content: '' }, { content: '' }, { content: '' }],
        [{ content: '' }, { content: '' }, { content: '' }]
      ],
      order: afterIndex + 1
    };
    
    const newBlocks = [...blocks];
    newBlocks.splice(afterIndex + 1, 0, newBlock);
    setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })));
  };

  const addImageBlock = async (file: File, afterIndex: number) => {
    const tempId = `block-${Date.now()}`;
    setUploadingBlockId(tempId);
    
    try {
      const result = await onImageUpload(file);
      
      const newBlock: ContentBlock = {
        id: tempId,
        type: 'image',
        content: '',
        imageUrl: result.url,
        imageS3Key: result.s3_key,
        alignment: 'center',
        width: 600,
        order: afterIndex + 1
      };
      
      const newBlocks = [...blocks];
      newBlocks.splice(afterIndex + 1, 0, newBlock);
      setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingBlockId(null);
    }
  };

  const addImageToColumn = async (file: File, blockId: string, columnId: string) => {
    setUploadingColumnId(columnId);
    
    try {
      const result = await onImageUpload(file);
      
      setBlocks(blocks.map(block => {
        if (block.id === blockId && block.columns) {
          return {
            ...block,
            columns: block.columns.map(col => 
              col.id === columnId 
                ? { ...col, type: 'image' as const, imageUrl: result.url, imageS3Key: result.s3_key, content: '' }
                : col
            )
          };
        }
        return block;
      }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingColumnId(null);
    }
  };

  const updateBlock = (id: string, content: string, images?: InlineImage[]) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content, inlineImages: images || b.inlineImages } : b));
  };

  const updateColumnContent = (blockId: string, columnId: string, content: string, images?: InlineImage[]) => {
    setBlocks(blocks.map(block => {
      if (block.id === blockId && block.columns) {
        return {
          ...block,
          columns: block.columns.map(col => 
            col.id === columnId ? { ...col, content, inlineImages: images || col.inlineImages } : col
          )
        };
      }
      return block;
    }));
  };

  const updateTableCell = (blockId: string, rowIndex: number, colIndex: number, content: string, images?: InlineImage[]) => {
    setBlocks(blocks.map(block => {
      if (block.id === blockId && block.tableData) {
        const newTableData = [...block.tableData];
        newTableData[rowIndex][colIndex] = { content, inlineImages: images };
        return { ...block, tableData: newTableData };
      }
      return block;
    }));
  };

  const updateTableHeader = (blockId: string, colIndex: number, content: string) => {
    setBlocks(blocks.map(block => {
      if (block.id === blockId && block.tableHeaders) {
        const newHeaders = [...block.tableHeaders];
        newHeaders[colIndex] = content;
        return { ...block, tableHeaders: newHeaders };
      }
      return block;
    }));
  };

  const addTableRow = (blockId: string) => {
    setBlocks(blocks.map(block => {
      if (block.id === blockId && block.tableData && block.tableHeaders) {
        const newRow = block.tableHeaders.map(() => ({ content: '' }));
        return { ...block, tableData: [...block.tableData, newRow] };
      }
      return block;
    }));
  };

  const addTableColumn = (blockId: string) => {
    setBlocks(blocks.map(block => {
      if (block.id === blockId && block.tableData && block.tableHeaders) {
        const newHeaders = [...block.tableHeaders, `Column ${block.tableHeaders.length + 1}`];
        const newTableData = block.tableData.map(row => [...row, { content: '' }]);
        return { ...block, tableHeaders: newHeaders, tableData: newTableData };
      }
      return block;
    }));
  };

  const removeTableRow = (blockId: string, rowIndex: number) => {
    setBlocks(blocks.map(block => {
      if (block.id === blockId && block.tableData && block.tableData.length > 1) {
        const newTableData = block.tableData.filter((_, i) => i !== rowIndex);
        return { ...block, tableData: newTableData };
      }
      return block;
    }));
  };

  const removeTableColumn = (blockId: string, colIndex: number) => {
    setBlocks(blocks.map(block => {
      if (block.id === blockId && block.tableData && block.tableHeaders && block.tableHeaders.length > 1) {
        const newHeaders = block.tableHeaders.filter((_, i) => i !== colIndex);
        const newTableData = block.tableData.map(row => row.filter((_, i) => i !== colIndex));
        return { ...block, tableHeaders: newHeaders, tableData: newTableData };
      }
      return block;
    }));
  };

  const deleteBlock = (id: string) => {
    if (blocks.length === 1) {
      setBlocks([{
        id: 'block-0',
        type: 'text',
        content: '',
        order: 0
      }]);
      return;
    }
    setBlocks(blocks.filter(b => b.id !== id).map((b, i) => ({ ...b, order: i })));
  };

  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggingIndex !== null && draggingIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggingIndex !== null && draggingIndex !== dropIndex) {
      const newBlocks = [...blocks];
      const [draggedBlock] = newBlocks.splice(draggingIndex, 1);
      newBlocks.splice(dropIndex, 0, draggedBlock);
      setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })));
    }
    
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleImageDrop = async (e: React.DragEvent, afterIndex: number) => {
    e.preventDefault();
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        await addImageBlock(file, afterIndex);
      }
    }
  };

  if (showPreview) {
    return (
      <div className="prose prose-lg max-w-4xl mx-auto">
        {blocks.map((block) => {
          if (block.type === 'text') {
            return (
              <div key={block.id} className="text-lg leading-relaxed prose max-w-none">
                {block.content.split('\n').map((line, i) => (
                  <div key={i}>
                    {line}
                    {i < block.content.split('\n').length - 1 && <br />}
                  </div>
                ))}
                {block.inlineImages?.map((img) => (
                  <img 
                    key={img.id}
                    src={img.url} 
                    alt="" 
                    className="rounded-lg my-2"
                    style={{ maxWidth: `${img.width || 400}px` }}
                  />
                ))}
              </div>
            );
          }
          
          if (block.type === 'heading') {
            return (
              <h2 key={block.id} className="text-4xl font-bold mt-12 mb-6">
                {block.content}
              </h2>
            );
          }
          
          if (block.type === 'image' && block.imageUrl) {
            return (
              <div key={block.id} className="my-8">
                <img 
                  src={block.imageUrl} 
                  alt="" 
                  className="w-full rounded-lg shadow-lg"
                  style={{ maxWidth: `${block.width || 600}px`, margin: '0 auto' }}
                />
              </div>
            );
          }

          if (block.type === 'columns' && block.columns) {
            return (
              <div 
                key={block.id} 
                className="grid gap-6 my-8"
                style={{ gridTemplateColumns: `repeat(${block.columnCount || 2}, 1fr)` }}
              >
                {block.columns.map((col) => (
                  <div key={col.id} className="space-y-2">
                    {col.type === 'text' ? (
                      <div className="text-base leading-relaxed prose max-w-none">
                        {col.content.split('\n').map((line, i) => (
                          <div key={i}>
                            {line}
                            {i < col.content.split('\n').length - 1 && <br />}
                          </div>
                        ))}
                        {col.inlineImages?.map((img) => (
                          <img 
                            key={img.id}
                            src={img.url} 
                            alt="" 
                            className="rounded-lg my-2"
                            style={{ maxWidth: `${img.width || 400}px` }}
                          />
                        ))}
                      </div>
                    ) : col.imageUrl ? (
                      <img 
                        src={col.imageUrl} 
                        alt="" 
                        className="w-full rounded-lg shadow-md"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            );
          }

          if (block.type === 'table' && block.tableData && block.tableHeaders) {
            return (
              <div key={block.id} className="my-8 overflow-x-auto">
                <table className="min-w-full border border-border rounded-lg">
                  <thead className="bg-muted">
                    <tr>
                      {block.tableHeaders.map((header, i) => (
                        <th key={i} className="px-4 py-2 text-left border-b border-border font-semibold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.tableData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-border last:border-0">
                        {row.map((cell, colIndex) => (
                          <td key={colIndex} className="px-4 py-2">
                            <div className="prose max-w-none text-sm">
                              {cell.content.split('\n').map((line, i) => (
                                <div key={i}>
                                  {line}
                                  {i < cell.content.split('\n').length - 1 && <br />}
                                </div>
                              ))}
                              {cell.inlineImages?.map((img) => (
                                <img 
                                  key={img.id}
                                  src={img.url} 
                                  alt="" 
                                  className="rounded-lg my-2"
                                  style={{ maxWidth: `${img.width || 300}px` }}
                                />
                              ))}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          
          return null;
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <div
          key={block.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          className={`relative group ${
            draggingIndex === index ? 'opacity-50' : ''
          } ${
            dragOverIndex === index ? 'border-t-2 border-primary' : ''
          }`}
        >
          <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1">
                {block.type === 'text' && (
                  <RichTextEditor
                    content={block.content}
                    inlineImages={block.inlineImages}
                    onChange={(content, images) => updateBlock(block.id, content, images)}
                    onImageUpload={onImageUpload}
                    placeholder="Write your content here..."
                    className="text-lg"
                    minHeight="200px"
                  />
                )}

                {block.type === 'heading' && (
                  <Input
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, e.target.value)}
                    placeholder="Section title..."
                    className="text-3xl font-bold border-none focus-visible:ring-0 bg-transparent"
                  />
                )}

                {block.type === 'image' && block.imageUrl && (
                  <div className="space-y-2">
                    <img 
                      src={block.imageUrl} 
                      alt="" 
                      className="w-full rounded-lg shadow-md"
                      style={{ maxWidth: `${block.width || 600}px` }}
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground">Width:</label>
                      <input
                        type="range"
                        min="300"
                        max="800"
                        value={block.width || 600}
                        onChange={(e) => {
                          const newWidth = parseInt(e.target.value);
                          setBlocks(blocks.map(b => 
                            b.id === block.id ? { ...b, width: newWidth } : b
                          ));
                        }}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-16">{block.width || 600}px</span>
                    </div>
                  </div>
                )}

                {block.type === 'columns' && block.columns && (
                  <div 
                    className="grid gap-4"
                    style={{ gridTemplateColumns: `repeat(${block.columnCount || 2}, 1fr)` }}
                  >
                    {block.columns.map((col) => (
                      <div key={col.id} className="border border-border rounded-lg p-3 bg-muted/30">
                        {col.type === 'text' ? (
                          <RichTextEditor
                            content={col.content}
                            inlineImages={col.inlineImages}
                            onChange={(content, images) => updateColumnContent(block.id, col.id, content, images)}
                            onImageUpload={onImageUpload}
                            placeholder="Column content..."
                            className="text-base"
                            minHeight="150px"
                          />
                        ) : col.imageUrl ? (
                          <div className="relative group/img">
                            <img 
                              src={col.imageUrl} 
                              alt="" 
                              className="w-full rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover/img:opacity-100 transition-opacity"
                              onClick={() => {
                                setBlocks(blocks.map(b => {
                                  if (b.id === block.id && b.columns) {
                                    return {
                                      ...b,
                                      columns: b.columns.map(c => 
                                        c.id === col.id ? { ...c, type: 'text' as const, imageUrl: undefined, imageS3Key: undefined } : c
                                      )
                                    };
                                  }
                                  return b;
                                }));
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                {block.type === 'table' && block.tableData && block.tableHeaders && (
                  <div className="space-y-2">
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-border rounded-lg">
                        <thead className="bg-muted">
                          <tr>
                            {block.tableHeaders.map((header, colIndex) => (
                              <th key={colIndex} className="relative px-2 py-2 border-b border-border">
                                <Input
                                  value={header}
                                  onChange={(e) => updateTableHeader(block.id, colIndex, e.target.value)}
                                  className="font-semibold border-none bg-transparent h-8 text-sm"
                                  placeholder={`Column ${colIndex + 1}`}
                                />
                                {block.tableHeaders && block.tableHeaders.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                    onClick={() => removeTableColumn(block.id, colIndex)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {block.tableData.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b border-border last:border-0 group/row">
                          {row.map((cell, colIndex) => (
                            <td key={colIndex} className="px-2 py-2">
                              <RichTextEditor
                                content={cell.content}
                                inlineImages={cell.inlineImages}
                                onChange={(content, images) => updateTableCell(block.id, rowIndex, colIndex, content, images)}
                                onImageUpload={onImageUpload}
                                placeholder="Cell content..."
                                className="text-sm"
                                minHeight="60px"
                              />
                            </td>
                          ))}
                              {block.tableData && block.tableData.length > 1 && (
                                <td className="px-2 py-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover/row:opacity-100"
                                    onClick={() => removeTableRow(block.id, rowIndex)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addTableRow(block.id)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Row
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addTableColumn(block.id)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Column
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteBlock(block.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addBlock('text', index)}
              className="h-8"
            >
              <Plus className="w-3 h-3 mr-1" />
              Text
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addBlock('heading', index)}
              className="h-8"
            >
              <Type className="w-3 h-3 mr-1" />
              Subtitle
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingBlockId === `block-${index}`}
              className="h-8"
            >
              <ImageIcon className="w-3 h-3 mr-1" />
              {uploadingBlockId === `block-${index}` ? 'Uploading...' : 'Image'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addColumnsBlock(2, index)}
              className="h-8"
            >
              <ColumnsIcon className="w-3 h-3 mr-1" />
              2 Columns
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addColumnsBlock(3, index)}
              className="h-8"
            >
              <ColumnsIcon className="w-3 h-3 mr-1" />
              3 Columns
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addTableBlock(index)}
              className="h-8"
            >
              <TableIcon className="w-3 h-3 mr-1" />
              Table
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  await addImageBlock(file, index);
                  e.target.value = '';
                }
              }}
            />
          </div>
        </div>
      ))}

      {blocks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="mb-4">Start writing your blog post</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => addBlock('text', -1)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Text Block
          </Button>
        </div>
      )}
    </div>
  );
}
