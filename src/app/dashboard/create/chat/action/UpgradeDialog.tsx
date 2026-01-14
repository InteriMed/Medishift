import React from 'react';

interface UpgradeDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

export const UpgradeDialog: React.FC<UpgradeDialogProps> = ({ 
  isOpen = false, 
  onClose,
  children 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        {children || (
          <div>
            <h2 className="text-xl font-semibold mb-4">Upgrade Required</h2>
            <p className="text-gray-600 mb-4">
              This feature is available in the Pro tier. Please upgrade to access this functionality.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Add upgrade logic here
                  console.log('Upgrade clicked');
                }}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                Upgrade
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};



