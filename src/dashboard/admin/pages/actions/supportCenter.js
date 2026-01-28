import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, orderBy, getDocs, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { Search, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import '../../../../styles/variables.css';

const SupportCenter = () => {
    const { t } = useTranslation(['admin']);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedTicket, setSelectedTicket] = useState(null);

    useEffect(() => {
        loadTickets();
    }, [statusFilter, loadTickets]);

    const loadTickets = async () => {
        setLoading(true);
        try {
            const ticketsRef = collection(db, 'supportTickets');
            let q = query(ticketsRef, orderBy('createdAt', 'desc'));

            if (statusFilter !== 'all') {
                q = query(q, where('status', '==', statusFilter));
            }

            const snapshot = await getDocs(q);
            const ticketsList = [];
            snapshot.forEach((doc) => {
                ticketsList.push({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
                    updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
                });
            });

            setTickets(ticketsList);
        } catch (error) {
            console.error('Error loading tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateTicketStatus = async (ticketId, newStatus) => {
        try {
            const ticketRef = doc(db, 'supportTickets', ticketId);
            await updateDoc(ticketRef, {
                status: newStatus,
                updatedAt: new Date()
            });
            loadTickets();
            if (selectedTicket?.id === ticketId) {
                setSelectedTicket({ ...selectedTicket, status: newStatus });
            }
        } catch (error) {
            console.error('Error updating ticket status:', error);
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                ticket.subject?.toLowerCase().includes(query) ||
                ticket.message?.toLowerCase().includes(query) ||
                ticket.userEmail?.toLowerCase().includes(query) ||
                ticket.userName?.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const getStatusIcon = (status) => {
        switch (status) {
            case 'open':
                return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'resolved':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'closed':
                return <XCircle className="w-4 h-4 text-gray-500" />;
            default:
                return <Clock className="w-4 h-4" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'open':
                return 'bg-yellow-100 text-yellow-800';
            case 'resolved':
                return 'bg-green-100 text-green-800';
            case 'closed':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Loading tickets...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                    {t('admin:supportCenter.title', 'Support Center')}
                </h1>
                <p className="text-muted-foreground">
                    {t('admin:supportCenter.subtitle', 'Manage and respond to support tickets')}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-card rounded-lg border border-border p-4">
                        <div className="flex items-center gap-3 mb-4">
                            <Search className="w-5 h-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder={t('admin:supportCenter.search', 'Search tickets...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div className="space-y-2">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                                    statusFilter === 'all' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                }`}
                            >
                                All Tickets ({tickets.length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('open')}
                                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                                    statusFilter === 'open' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                }`}
                            >
                                Open ({tickets.filter(t => t.status === 'open').length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('resolved')}
                                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                                    statusFilter === 'resolved' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                }`}
                            >
                                Resolved ({tickets.filter(t => t.status === 'resolved').length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('closed')}
                                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                                    statusFilter === 'closed' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                }`}
                            >
                                Closed ({tickets.filter(t => t.status === 'closed').length})
                            </button>
                        </div>
                    </div>

                    <div className="bg-card rounded-lg border border-border p-4 max-h-[600px] overflow-y-auto">
                        <div className="space-y-2">
                            {filteredTickets.map((ticket) => (
                                <button
                                    key={ticket.id}
                                    onClick={() => setSelectedTicket(ticket)}
                                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                                        selectedTicket?.id === ticket.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:bg-muted'
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{ticket.subject}</div>
                                            <div className="text-sm text-muted-foreground truncate">
                                                {ticket.userEmail}
                                            </div>
                                        </div>
                                        {getStatusIcon(ticket.status)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {ticket.createdAt && format(ticket.createdAt, 'MMM d, yyyy')}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    {selectedTicket ? (
                        <div className="bg-card rounded-lg border border-border p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-foreground mb-2">
                                        {selectedTicket.subject}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                                            {selectedTicket.status}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {selectedTicket.createdAt && format(selectedTicket.createdAt, 'MMM d, yyyy HH:mm')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground mb-1">From</div>
                                    <div className="text-foreground">{selectedTicket.userName} ({selectedTicket.userEmail})</div>
                                </div>

                                <div>
                                    <div className="text-sm font-medium text-muted-foreground mb-1">Category</div>
                                    <div className="text-foreground">{selectedTicket.category || 'General'}</div>
                                </div>

                                <div>
                                    <div className="text-sm font-medium text-muted-foreground mb-1">Priority</div>
                                    <div className="text-foreground capitalize">{selectedTicket.priority || 'Medium'}</div>
                                </div>

                                <div>
                                    <div className="text-sm font-medium text-muted-foreground mb-1">Message</div>
                                    <div className="text-foreground whitespace-pre-wrap bg-muted/50 p-4 rounded-md">
                                        {selectedTicket.message}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-border">
                                {selectedTicket.status === 'open' && (
                                    <>
                                        <button
                                            onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')}
                                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                                        >
                                            Mark as Resolved
                                        </button>
                                        <button
                                            onClick={() => updateTicketStatus(selectedTicket.id, 'closed')}
                                            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                                        >
                                            Close Ticket
                                        </button>
                                    </>
                                )}
                                {selectedTicket.status === 'resolved' && (
                                    <button
                                        onClick={() => updateTicketStatus(selectedTicket.id, 'open')}
                                        className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
                                    >
                                        Reopen Ticket
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-card rounded-lg border border-border p-12 text-center">
                            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground">
                                {t('admin:supportCenter.selectTicket', 'Select a ticket to view details')}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupportCenter;

