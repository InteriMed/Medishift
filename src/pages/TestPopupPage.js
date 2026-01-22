import React, { useState } from 'react';
import Dialog from '../components/Dialog/Dialog';
import Button from '../components/BoxedInputFields/Button';

const TestPopupPage = () => {
    const [openDialog, setOpenDialog] = useState(null);

    const closeDialog = () => setOpenDialog(null);

    const dialogs = [
        {
            type: 'default',
            title: 'Default Dialog',
            content: 'This is a standard dialog message. It can contain any content.',
            actions: (
                <>
                    <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
                    <Button variant="primary" onClick={closeDialog}>Confirm</Button>
                </>
            )
        },
        {
            type: 'warning',
            title: 'Warning Dialog',
            content: 'This is a warning message. Proceed with caution.',
            actions: (
                <>
                    <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
                    <Button variant="warning" onClick={closeDialog}>Proceed</Button>
                </>
            )
        },
        {
            type: 'error',
            title: 'Error Dialog',
            content: 'An error occurred or a destructive action is about to happen.',
            actions: (
                <>
                    <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
                    <Button variant="danger" onClick={closeDialog}>Delete</Button>
                </>
            )
        },
        {
            type: 'success',
            title: 'Success Dialog',
            content: 'Operation completed successfully!',
            actions: (
                <Button variant="primary" onClick={closeDialog}>Continue</Button>
            )
        },
        {
            type: 'info',
            title: 'Info Dialog',
            content: 'Here is some useful information for the user.',
            actions: (
                <Button variant="primary" onClick={closeDialog}>Got it</Button>
            )
        }
    ];

    return (
        <div className="p-10 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Dialog Component Test Page</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dialogs.map((d) => (
                    <div key={d.type} className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-semibold mb-4 capitalize text-slate-900">{d.type}</h2>
                        <Button
                            variant="primary"
                            onClick={() => setOpenDialog(d.type)}
                            className="w-full"
                        >
                            Open {d.type}
                        </Button>
                    </div>
                ))}
            </div>

            {/* Render the active dialog */}
            {dialogs.map((d) => (
                <Dialog
                    key={d.type}
                    isOpen={openDialog === d.type}
                    onClose={closeDialog}
                    title={d.title}
                    messageType={d.type}
                >
                    <p className="text-slate-600">
                        {d.content}
                    </p>
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm text-slate-500">
                        Long content scroll test...<br />
                        {[...Array(5)].map((_, i) => <div key={i}>Line {i + 1} of content content content...</div>)}
                    </div>
                </Dialog>
            ))}

            {/* Specific Dialog for "Facility Not Found" Replication */}
            <Dialog
                isOpen={openDialog === 'facility_not_found'}
                onClose={closeDialog}
                title="Facility Not Found"
                messageType="error"
                size="medium"
                actions={
                    <>
                        <Button variant="secondary" onClick={closeDialog}>Contact Admin</Button>
                        <Button variant="danger" onClick={closeDialog}>Leave Facility</Button>
                    </>
                }
            >
                <p className="text-gray-700">
                    The facility you're trying to access no longer exists or you no longer have access to it.
                </p>
            </Dialog>

            <div className="mt-8 p-6 bg-white rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">Specific Cases</h2>
                <Button
                    variant="danger"
                    onClick={() => setOpenDialog('facility_not_found')}
                >
                    Test "Facility Not Found" Popup
                </Button>
            </div>

        </div>
    );
};

export default TestPopupPage;
