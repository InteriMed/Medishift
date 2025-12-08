"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface RawDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rawData: { input?: string; raw_output?: string; iteration?: number; data?: any; parsed?: any } | null;
}

export function RawDataDialog({ open, onOpenChange, rawData }: RawDataDialogProps) {
  const dataSchema = rawData?.data || rawData?.parsed?.data_schema;
  const hasDataSchema = dataSchema && typeof dataSchema === 'object' && (
    (dataSchema.required && Object.keys(dataSchema.required).length > 0) ||
    (dataSchema.optional && Object.keys(dataSchema.optional).length > 0) ||
    Object.keys(dataSchema).filter(k => k !== 'required' && k !== 'optional').length > 0
  );
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Raw Agent Data</DialogTitle>
          <DialogDescription>Iteration {rawData?.iteration || 'N/A'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {rawData?.input && (
            <div>
              <h4 className="font-semibold mb-2">Raw Input:</h4>
              <pre className="bg-muted p-3 rounded text-sm overflow-auto whitespace-pre-wrap break-words max-h-[40vh]">
                {rawData.input}
              </pre>
            </div>
          )}
          {rawData?.raw_output && (
            <div>
              <h4 className="font-semibold mb-2">Raw Output:</h4>
              <pre className="bg-muted p-3 rounded text-sm overflow-auto whitespace-pre-wrap break-words max-h-[40vh]">
                {rawData.raw_output}
              </pre>
            </div>
          )}
          {rawData?.parsed && typeof rawData.parsed === 'object' && Object.keys(rawData.parsed).length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Cleaned & Validated Data:</h4>
              {rawData.parsed?.error ? (
                <div className="space-y-2">
                  <div className="text-xs text-destructive font-medium">
                    Validation Error: {rawData.parsed.error}
                  </div>
                  {rawData.parsed?.raw_output && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Raw LLM Output:</div>
                      <pre className="bg-muted p-3 rounded text-sm overflow-auto whitespace-pre-wrap break-words max-h-[40vh]">
                        {rawData.parsed.raw_output}
                      </pre>
                    </div>
                  )}
                  <pre className="bg-muted p-3 rounded text-sm overflow-auto whitespace-pre-wrap break-words max-h-[40vh]">
                    {JSON.stringify(rawData.parsed, null, 2)}
                  </pre>
                </div>
              ) : (
                <>
                  <pre className="bg-muted p-3 rounded text-sm overflow-auto whitespace-pre-wrap break-words max-h-[40vh]">
                    {JSON.stringify(rawData.parsed, null, 2)}
                  </pre>
                  {rawData.parsed?.signature && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Integrity Signature: {rawData.parsed.signature.substring(0, 16)}...
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {hasDataSchema && (
            <div>
              <h4 className="font-semibold mb-2">Data Schema:</h4>
              <pre className="bg-muted p-3 rounded text-sm overflow-auto whitespace-pre-wrap break-words max-h-[40vh]">
                {JSON.stringify(dataSchema, null, 2)}
              </pre>
            </div>
          )}
          {!rawData?.input && !rawData?.raw_output && !rawData?.parsed && !hasDataSchema && (
            <div className="text-muted-foreground text-sm">
              No raw data available for this iteration.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

