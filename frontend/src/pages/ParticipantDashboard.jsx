import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { Calendar, CheckCircle2, QrCode } from 'lucide-react';
import { whenText } from '../utils/dates';

const ParticipantDashboard = () => {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming'); // upcoming, normal, merchandise, completed, cancelled

    useEffect(() => {
        fetchRegistrations();
    }, []);

    const fetchRegistrations = async () => {
        try {
            const { data } = await api.get('/events/my-registrations');
            setRegistrations(data.registrations || []);
        } catch {
            toast.error('Failed to load registrations');
        } finally {
            setLoading(false);
        }
    };

    const cancelRegistration = async (eventId) => {
        if (!window.confirm("Are you sure you want to cancel?")) return;
        try {
            await api.delete(`/events/${eventId}/cancel`);
            toast.success('Registration cancelled');
            fetchRegistrations();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to cancel');
        }
    };

    if (loading) return <div>Loading...</div>;

    const filteredRegistrations = registrations.filter(reg => {
        const isCancelled = reg.status === 'cancelled' || reg.paymentStatus === 'rejected';
        const isCompleted = reg.event?.status === 'completed';
        const isUpcoming = reg.status === 'registered' && !isCompleted;

        switch (activeTab) {
            case 'upcoming': return isUpcoming;
            case 'normal': return reg.event?.type === 'normal';
            case 'merchandise': return reg.event?.type === 'merchandise';
            case 'completed': return isCompleted;
            case 'cancelled': return isCancelled;
            default: return isUpcoming;
        }
    });

    const tabs = [
        { id: 'upcoming', label: 'Upcoming Events' },
        { id: 'normal', label: 'Normal History' },
        { id: 'merchandise', label: 'Merchandise History' },
        { id: 'completed', label: 'Completed' },
        { id: 'cancelled', label: 'Cancelled/Rejected' }
    ];

    return (
        <div>
            <h2 className="mb-4">My Dashboard</h2>

            {/* Tabs Navigation */}
            <div className="flex gap-2 mb-6 border-b" style={{ borderColor: 'var(--border-color)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-outline'}`}
                        style={{ border: activeTab === tab.id ? 'none' : '1px solid var(--border-color)', borderRadius: '20px', padding: '0.5rem 1rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {filteredRegistrations.length === 0 ? (
                <div className="surface text-center p-8">
                    <p className="mb-4">No events found in this category.</p>
                    {activeTab === 'upcoming' && (
                        <Link to="/" className="btn btn-primary">Browse Events</Link>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {filteredRegistrations.map((reg) => (
                        <div key={reg._id} className="surface flex-col justify-between h-full" style={{ gap: '1rem' }}>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 style={{ fontSize: '1.25rem' }}>{reg.event?.name}</h3>
                                    <span className={`badge ${reg.event?.type === 'merchandise' ? 'badge-warning' : 'badge-primary'}`}>
                                        {reg.event?.type}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-muted mb-2">
                                    <Calendar size={16} />
                                    {whenText(reg.event)}
                                </div>

                                {reg.event?.type === 'merchandise' && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <strong>Payment: </strong>
                                        <span className={`badge ${reg.paymentStatus === 'approved' ? 'badge-success' : reg.paymentStatus === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                                            {reg.paymentStatus}
                                        </span>
                                    </div>
                                )}

                                <div className="mt-2 text-muted" style={{ fontSize: '0.875rem' }}>
                                    Ticket ID: {reg.ticketId.substring(0, 8)}...
                                </div>

                                {reg.status === 'cancelled' && (
                                    <div className="mt-2 text-danger font-medium text-sm">
                                        Status: CANCELLED
                                    </div>
                                )}
                            </div>

                            {/* QR Code Tier A Feature reveal */}
                            {reg.qrCode && reg.status === 'registered' && reg.event?.status !== 'completed' && (
                                <div className="bg-white p-2 text-center rounded mt-2 border" style={{ borderColor: 'var(--border-color)' }}>
                                    <img src={reg.qrCode} alt="Your Ticket QR" style={{ width: '120px', height: '120px' }} />
                                    <div className="flex justify-center items-center gap-1 mt-1 font-medium" style={{ fontSize: '0.75rem' }}>
                                        <QrCode size={14} /> Scan for Entry
                                    </div>
                                </div>
                            )}

                            {reg.attended && (
                                <div className="flex justify-center items-center gap-2 p-2 mt-2 bg-green-50 text-green-700 rounded" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
                                    <CheckCircle2 size={16} />
                                    Marked Attended
                                </div>
                            )}

                            <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                                <Link to={`/events/${reg.event?._id}`} className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }}>
                                    Event Details
                                </Link>
                                {!reg.attended && reg.event?.status !== 'completed' && reg.status === 'registered' && (
                                    <button onClick={() => cancelRegistration(reg.event?._id)} className="btn btn-danger">
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ParticipantDashboard;
