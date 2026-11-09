import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { PlusCircle, QrCode, ClipboardList } from 'lucide-react';

const OrganizerDashboard = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const { data } = await api.get('/events/my-events');
            setEvents(data.events || []);
        } catch (err) {
            toast.error('Failed to fetch events');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (eventId, newStatus) => {
        try {
            await api.patch(`/events/${eventId}/status`, { status: newStatus });
            toast.success(`Event marked as ${newStatus}`);
            fetchEvents();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update status');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2>My Events</h2>
                <Link to="/events/create" className="btn btn-primary">
                    <PlusCircle size={18} />
                    Create Event
                </Link>
            </div>

            {events.length === 0 ? (
                <div className="surface text-center p-8">
                    <p className="mb-4">You haven't created any events yet.</p>
                </div>
            ) : (
                <div className="flex-col gap-4">
                    {events.map((event) => (
                        <div key={event._id} className="surface flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 style={{ fontSize: '1.25rem', margin: 0 }}>{event.name}</h3>
                                    <span className={`badge ${event.status === 'published' ? 'badge-success' : 'badge-primary'}`}>
                                        {event.status}
                                    </span>
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                                    {new Date(event.startDate).toLocaleDateString()} &bull; {event.type}
                                    {event.type === 'merchandise' && ` • Stock: ${event.stockQuantity}`}
                                </div>
                                {event.status === 'completed' && event.attendanceCount !== undefined && (
                                    <div className="mt-2 text-sm bg-blue-50 text-blue-800 p-2 rounded">
                                        <div className="font-semibold mb-1">Event Analytics:</div>
                                        Total Attended: {event.attendanceCount} | Check the Manage dashboard for full CSV exports and records.
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                {event.status !== 'completed' && event.status !== 'closed' && (
                                    <Link to={`/events/${event._id}/edit`} className="btn btn-outline" title="Edit Event Details">
                                        Edit
                                    </Link>
                                )}
                                <Link to={`/events/${event._id}`} className="btn btn-outline" title="View Public Page">
                                    View Event
                                </Link>
                                <Link to={`/events/${event._id}/manage`} className="btn btn-outline" title="Manage Registrations">
                                    <ClipboardList size={18} /> Manage
                                </Link>
                                {['published', 'ongoing'].includes(event.status) && (
                                    <Link to={`/events/${event._id}/scanner`} className="btn btn-secondary" title="QR Scanner">
                                        <QrCode size={18} /> Scan
                                    </Link>
                                )}
                                {event.status === 'completed' && (
                                    <Link to={`/events/${event._id}/feedback`} className="btn btn-secondary" title="View Feedback">
                                        View Feedback
                                    </Link>
                                )}
                                {event.status === 'draft' && (
                                    <button onClick={() => updateStatus(event._id, 'published')} className="btn btn-primary">Publish</button>
                                )}
                                {event.status === 'published' && (
                                    <button onClick={() => updateStatus(event._id, 'completed')} className="btn btn-outline">End Event</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OrganizerDashboard;
