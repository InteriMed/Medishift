import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useDashboard } from '../../contexts/DashboardContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { Support } from './Support';

const SupportPage = () => {
    const { user, selectedWorkspace } = useDashboard();
    const { showError } = useNotification();
    const [threads, setThreads] = useState([]);
    const [selectedThread, setSelectedThread] = useState(null);
    const [isLoadingThreads, setIsLoadingThreads] = useState(true);
    const threadsListener = useRef(null);

    const canAccessThreads = useMemo(() => {
        return user?.hasFacilityProfile === true;
    }, [user]);

    const loadThreads = useCallback(() => {
        if (!user || !canAccessThreads) {
            setThreads([]);
            setIsLoadingThreads(false);
            if (threadsListener.current) {
                threadsListener.current();
                threadsListener.current = null;
            }
            return;
        }

        setIsLoadingThreads(true);

        try {
            const threadsRef = collection(db, 'threads');
            const threadsQuery = query(
                threadsRef,
                where('participantIds', 'array-contains', user.uid),
                orderBy('lastMessageTimestamp', 'desc')
            );

            if (threadsListener.current) {
                threadsListener.current();
            }

            threadsListener.current = onSnapshot(
                threadsQuery,
                async (snapshot) => {
                    const threadsList = [];
                    snapshot.docs.forEach(doc => {
                        const threadData = doc.data();
                        const otherParticipant = threadData.participantInfo?.find((p) => p.userId !== user.uid);
                        let displayInfo = {};

                        if (otherParticipant) {
                            displayInfo = {
                                displayName: otherParticipant.displayName,
                                photoURL: otherParticipant.photoURL,
                                role: otherParticipant.roleInConversation
                            };
                        } else if (threadData.title) {
                            displayInfo = {
                                displayName: threadData.title,
                                photoURL: threadData.photoURL
                            };
                        } else {
                            displayInfo = {
                                displayName: 'Thread',
                                photoURL: null
                            };
                        }

                        threadsList.push({
                            id: doc.id,
                            ...threadData,
                            ...displayInfo,
                            isGroupThread: (threadData.participantIds?.length || 0) > 2,
                            participantCount: threadData.participantIds?.length || 0
                        });
                    });

                    threadsList.sort((a, b) => {
                        const aTime = a.lastMessageTimestamp?.toDate?.() || new Date(0);
                        const bTime = b.lastMessageTimestamp?.toDate?.() || new Date(0);
                        return bTime.getTime() - aTime.getTime();
                    });

                    setThreads(threadsList);
                    setIsLoadingThreads(false);
                },
                (err) => {
                    console.error('Error listening to threads:', err);
                    if (err.code === 'permission-denied' || err.message?.includes('permission')) {
                        showError('You do not have permission to access threads. Please contact your administrator.');
                    } else {
                        showError(err.message || 'Failed to load threads');
                    }
                    setThreads([]);
                    setIsLoadingThreads(false);
                }
            );
        } catch (err) {
            console.error('Error setting up threads listener:', err);
            if (err.code === 'permission-denied' || err.message?.includes('permission')) {
                showError('You do not have permission to access threads. Please contact your administrator.');
            } else {
                showError(err.message || 'Failed to load threads');
            }
            setThreads([]);
            setIsLoadingThreads(false);
        }
    }, [user, canAccessThreads, showError]);

    useEffect(() => {
        loadThreads();
        return () => {
            if (threadsListener.current) {
                threadsListener.current();
                threadsListener.current = null;
            }
        };
    }, [loadThreads]);

    const handleSelectThread = (threadId) => {
        const thread = threads.find(t => t.id === threadId);
        if (thread) {
            setSelectedThread(thread);
        }
    };

    return (
        <Support
            canAccessThreads={canAccessThreads}
            threads={threads}
            isLoadingThreads={isLoadingThreads}
            onSelectThread={handleSelectThread}
            selectedThread={selectedThread}
        />
    );
};

export default SupportPage;

