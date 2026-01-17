import React from 'react';
import { FiMessageSquare, FiFileText, FiCalendar, FiUser } from 'react-icons/fi';

/**
 * Mock Tutorial Data Components
 * These components appear ONLY during tutorials to ensure tooltip selectors find their targets
 */

export const MockMessagesData = () => (
    <div className="tutorial-mock-data" style={{ padding: '20px' }}>
        {/* Mock Conversations List */}
        <div className="conversations-list" style={{
            backgroundColor: 'var(--bg-secondary, #f9fafb)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
        }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>Recent Conversations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="conversation-item" style={{
                    padding: '12px',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: '#3b82f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <FiUser size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Dr. Smith - Geneva Hospital</h4>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                                Regarding the temporary contract for February...
                            </p>
                        </div>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>2h ago</span>
                    </div>
                </div>
                <div className="conversation-item" style={{
                    padding: '12px',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <FiUser size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Lausanne Clinic - HR Department</h4>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                                Your application has been reviewed...
                            </p>
                        </div>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>1d ago</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Mock New Message Button */}
        <button className="new-message-button" style={{
            padding: '12px 24px',
            backgroundColor: 'var(--color-logo-2, #0f172a)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }}>
            <FiMessageSquare size={18} />
            New Message
        </button>
    </div>
);

export const MockContractsData = () => (
    <div className="tutorial-mock-data" style={{ padding: '20px' }}>
        {/* Mock Create Contract Button */}
        <div style={{ marginBottom: '24px' }}>
            <button className="contracts-create-button" style={{
                padding: '12px 24px',
                backgroundColor: 'var(--color-logo-2, #0f172a)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <FiFileText size={18} />
                Create Contract
            </button>
        </div>

        {/* Mock Contracts List */}
        <div className="contracts-list" style={{
            backgroundColor: 'var(--bg-secondary, #f9fafb)',
            borderRadius: '8px',
            padding: '16px'
        }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>Your Contracts</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="contract-card" style={{
                    padding: '16px',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Geneva Hospital - Temporary Contract</h4>
                        <span style={{
                            padding: '4px 12px',
                            backgroundColor: 'transparent',
                            color: 'var(--green-3)',
                            borderColor: 'var(--green-3)',
                            border: '1px solid',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600'
                        }}>Active</span>
                    </div>
                    <p style={{ margin: '8px 0', fontSize: '14px', color: '#6b7280' }}>
                        <strong>Start:</strong> 2026-02-01 | <strong>End:</strong> 2026-03-31
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
                        Emergency Department - Full-time position
                    </p>
                </div>
                <div className="contract-card" style={{
                    padding: '16px',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    borderLeft: '4px solid var(--yellow-3)',
                    cursor: 'pointer'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--yellow-3)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>Lausanne Clinic - Part-time Contract</h4>
                        <span style={{
                            padding: '4px 12px',
                            backgroundColor: 'var(--white)',
                            color: 'var(--yellow-3)',
                            borderColor: 'var(--yellow-3)',
                            border: '1px solid',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600'
                        }}>Pending</span>
                    </div>
                    <p style={{ margin: '8px 0', fontSize: '14px', color: 'var(--yellow-3)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                        <strong>Start:</strong> 2026-04-01 | <strong>End:</strong> 2026-06-30
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--yellow-3)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                        General Practice - Weekends only
                    </p>
                </div>
            </div>
        </div>
    </div>
);

export const MockCalendarData = () => (
    <div className="tutorial-mock-data" style={{ padding: '20px' }}>
        {/* Mock Calendar View Options */}
        <div className="calendar-view-options" style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            padding: '4px',
            backgroundColor: 'var(--bg-secondary, #f9fafb)',
            borderRadius: '8px',
            width: 'fit-content'
        }}>
            <button style={{
                padding: '8px 16px',
                backgroundColor: 'var(--color-logo-2, #0f172a)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
            }}>Day</button>
            <button style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
            }}>Week</button>
            <button style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
            }}>Month</button>
        </div>

        {/* Mock New Appointment Button */}
        <button className="new-appointment-button" style={{
            padding: '12px 24px',
            backgroundColor: 'var(--color-logo-2, #0f172a)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px'
        }}>
            <FiCalendar size={18} />
            New Appointment
        </button>

        {/* Mock Calendar Grid */}
        <div style={{
            backgroundColor: 'var(--bg-secondary, #f9fafb)',
            borderRadius: '8px',
            padding: '16px',
            minHeight: '300px'
        }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>Today's Schedule</h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
                You have no appointments scheduled for today. Click "New Appointment" to create one.
            </p>
        </div>
    </div>
);
