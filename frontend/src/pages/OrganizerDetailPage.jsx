import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Building2, CalendarDays, UserPlus, Check } from 'lucide-react';

const OrganizerDetailPage = () => {
    const { orgId } = useParams();
    const { user, isAuthenticated } = useAuth();

    const [organizer, setOrganizer] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState([]);

    useEffect(() => {
        const fetchOrganizerData = async () => {
            try {
                // Fetch all organizers and find the specific one (as there's no single public org endpoint)
                const orgsRes = await api.get('/users/organizers');
                const org = orgsRes.data.organizers.find(o => o._id === orgId);

                if (!org) {
                    toast.error('Organizer not found');
                    setLoading(false);
                    return;
                }
                setOrganizer(org);

                // Fetch published events and filter by this organizer
                const eventsRes = await api.get('/events');
                const orgEvents = eventsRes.data.events.filter(e => e.organizer?._id === orgId);
                setEvents(orgEvents);

                // Fetch follow preferences
                if (isAuthenticated && user?.role === 'participant') {
                    const meRes = await api.get('/users/me');
                    setFollowing(meRes.data.user.followedOrganizers || []);
                }
            } catch (error) {
                toast.error('Failed to load organizer details');
            } finally {
                setLoading(false);
            }
        };
        fetchOrganizerData();
    }, [orgId, isAuthenticated, user]);

    const handleFollowToggle = async () => {
        try {
            let updatedFollowing = [...following];
            if (updatedFollowing.includes(orgId)) {
                updatedFollowing = updatedFollowing.filter(id => id !== orgId);
            } else {
                updatedFollowing.push(orgId);
            }
            await api.patch('/users/preferences', { followedOrganizers: updatedFollowing });
            setFollowing(updatedFollowing);
            toast.success(updatedFollowing.includes(orgId) ? `Followed ${organizer.firstName}` : `Unfollowed ${organizer.firstName}`);
        } catch (error) {
            toast.error('Failed to update follow preferences.');
        }
    };

    if (loading) return <div>Loading club details...</div>;
    if (!organizer) return <div>Organizer not found.</div>;

    const isFollowing = following.includes(orgId);

    // Split events into Upcoming, Ongoing, and Past based on endDate or startDate
    const now = new Date();
    const upcomingEvents = events.filter(e => new Date(e.startDate) > now && !['completed', 'closed'].includes(e.status));
    const ongoingEvents = events.filter(e => new Date(e.startDate) <= now && new Date(e.endDate || e.startDate) >= now && !['completed', 'closed'].includes(e.status));
    const pastEvents = events.filter(e => new Date(e.endDate || e.startDate) < now || ['completed', 'closed'].includes(e.status));

    return (
        <div className="flex-col gap-8 max-w-4xl mx-auto">
            {/* Organizer Header */}
            <div className="surface flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Building2 size={32} className="text-primary" />
                        <h1 style={{ margin: 0, fontSize: '2rem' }}>
                            {organizer.firstName} {organizer.lastName}
                        </h1>
                    </div>
                    <div className="text-muted mb-4">{organizer.email}</div>
                    {organizer.college && (
                        <div className="badge badge-primary">{organizer.college}</div>
                    )}
                </div>

                {isAuthenticated && user?.role === 'participant' && (
                    <button
                        onClick={handleFollowToggle}
                        className={`btn ${isFollowing ? 'btn-primary' : 'btn-outline'} flex items-center gap-2`}
                    >
                        {isFollowing ? (
                            <><Check size={18} /> Following</>
                        ) : (
                            <><UserPlus size={18} /> Follow Club</>
                        )}
                    </button>
                )}
            </div>

            {/* Events Section */}
            <div>
                <h2 className="mb-6">Published Events</h2>

                {events.length === 0 ? (
                    <div className="text-center p-8 bg-slate-50 border rounded text-muted">
                        This organizer hasn't published any events yet.
                    </div>
                ) : (
                    <div className="flex-col gap-8">
                        {upcomingEvents.length > 0 && (
                            <div className="flex-col gap-4">
                                <h3>Upcoming Events ({upcomingEvents.length})</h3>
                                <div style={styles.grid}>
                                    {upcomingEvents.map(renderEventCard)}
                                </div>
                            </div>
                        )}

                        {ongoingEvents.length > 0 && (
                            <div className="flex-col gap-4">
                                <h3>Ongoing Events ({ongoingEvents.length})</h3>
                                <div style={styles.grid}>
                                    {ongoingEvents.map(renderEventCard)}
                                </div>
                            </div>
                        )}

                        {pastEvents.length > 0 && (
                            <div className="flex-col gap-4">
                                <h3 className="text-muted">Past / Completed Events ({pastEvents.length})</h3>
                                <div style={styles.grid}>
                                    {pastEvents.map(renderEventCard)}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper function to render a common event card format
const renderEventCard = (event) => (
    <div key={event._id} className="surface flex-col" style={{ gap: '1rem' }}>
        <div className="flex justify-between items-start">
            <h4 style={{ fontSize: '1.125rem', margin: 0, paddingRight: '1rem' }}>{event.name}</h4>
            <span className={`badge ${event.type === 'merchandise' ? 'badge-warning' : 'badge-primary'}`}>
                {event.type}
            </span>
        </div>

        <p className="text-sm text-muted line-clamp-2" style={{ flex: 1 }}>{event.description}</p>

        <div className="flex items-center gap-2 text-sm text-muted mt-2">
            <CalendarDays size={16} />
            {new Date(event.startDate).toLocaleDateString()}
        </div>

        <Link to={`/events/${event._id}`} className="btn btn-outline text-center mt-4">
            View Details
        </Link>
    </div>
);

const styles = {
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem'
    }
};

export default OrganizerDetailPage;
