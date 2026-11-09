import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { CalendarDays, Users, Search, Filter, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { whenText } from '../utils/dates';

const LandingPage = () => {
    const { user, isAuthenticated } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [followedOrgs, setFollowedOrgs] = useState([]);

    // Filtering & Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, normal, merchandise
    const [filterEligibility, setFilterEligibility] = useState('all'); // all, iiit, open
    const [filterDate, setFilterDate] = useState('all'); // all, upcoming, past
    const [filterFollowed, setFilterFollowed] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/events');
                setEvents(res.data.events);

                if (isAuthenticated && user?.role === 'participant') {
                    const meRes = await api.get('/users/me');
                    setFollowedOrgs(meRes.data.user.followedOrganizers || []);
                }
            } catch (err) {
                console.error("Failed to fetch events:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [isAuthenticated, user]);

    // Derived State: Trending Events (Top 3 by attendanceCount or random if tied)
    const trendingEvents = useMemo(() => {
        return [...events]
            .sort((a, b) => (b.attendanceCount || 0) - (a.attendanceCount || 0))
            .slice(0, 3);
    }, [events]);

    // Derived State: Filtered & Searched Events
    const filteredEvents = useMemo(() => {
        const now = new Date();
        const sq = searchQuery.toLowerCase();

        return events.filter(e => {
            // 1. Search (Fuzzy/Partial on Name or Organizer Name)
            const matchName = e.name.toLowerCase().includes(sq);
            const matchOrg = (e.organizer?.firstName + ' ' + e.organizer?.lastName).toLowerCase().includes(sq);
            if (sq && !matchName && !matchOrg) return false;

            // 2. Event Type
            if (filterType !== 'all' && e.type !== filterType) return false;

            // 3. Eligibility
            let evElig = (e.eligibility || 'open').toLowerCase();
            // Map common terms to simplistic matching
            if (filterEligibility === 'iiit' && !evElig.includes('iiit')) return false;
            if (filterEligibility === 'open' && evElig.includes('iiit')) return false;

            // 4. Date Range
            const evStart = new Date(e.startDate);
            const evEnd = new Date(e.endDate || e.startDate);
            const isUpcoming = evStart > now && !['completed', 'closed'].includes(e.status);
            const isOngoing = evStart <= now && evEnd >= now && !['completed', 'closed'].includes(e.status);
            const isPast = evEnd < now || ['completed', 'closed'].includes(e.status);

            if (filterDate === 'upcoming' && !isUpcoming) return false;
            if (filterDate === 'ongoing' && !isOngoing) return false;
            if (filterDate === 'past' && !isPast) return false;

            // 5. Followed Clubs (If participant is logged in)
            if (filterFollowed && isAuthenticated) {
                if (!followedOrgs.includes(e.organizer?._id)) return false;
            }

            return true;
        });
    }, [events, searchQuery, filterType, filterEligibility, filterDate, filterFollowed, followedOrgs, isAuthenticated]);

    return (
        <div className="flex-col gap-10">
            {/* Hero Section */}
            <section style={styles.hero}>
                <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Welcome to Felicity</h1>
                <p style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto', color: 'var(--text-muted)' }}>
                    Discover, register, and track all your campus events in one centralized minimal platform.
                </p>
            </section>

            {/* Trending Section */}
            {!loading && trendingEvents.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp size={24} className="text-primary" />
                        <h2 style={{ margin: 0 }}>Trending Events</h2>
                    </div>
                    <div style={styles.grid}>
                        {trendingEvents.map(e => <EventCard key={`trend-${e._id}`} event={e} />)}
                    </div>
                </section>
            )}

            {/* Browse & Filter Section */}
            <section id="browse">
                <div className="flex-col gap-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Search size={24} className="text-primary" />
                        <h2 style={{ margin: 0 }}>Browse Events</h2>
                    </div>

                    {/* Filter Bar */}
                    <div className="surface flex flex-wrap gap-4 items-end bg-slate-50">
                        <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                            <label className="form-label text-sm">Search</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Event or Club name..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="form-group" style={{ width: '150px', marginBottom: 0 }}>
                            <label className="form-label text-sm">Event Type</label>
                            <select className="form-input" value={filterType} onChange={e => setFilterType(e.target.value)}>
                                <option value="all">All Types</option>
                                <option value="normal">Normal</option>
                                <option value="merchandise">Merchandise</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ width: '150px', marginBottom: 0 }}>
                            <label className="form-label text-sm">Eligibility</label>
                            <select className="form-input" value={filterEligibility} onChange={e => setFilterEligibility(e.target.value)}>
                                <option value="all">Any</option>
                                <option value="iiit">IIIT Students</option>
                                <option value="open">Open To All</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ width: '150px', marginBottom: 0 }}>
                            <label className="form-label text-sm">Date</label>
                            <select className="form-input" value={filterDate} onChange={e => setFilterDate(e.target.value)}>
                                <option value="all">All Time</option>
                                <option value="upcoming">Upcoming</option>
                                <option value="ongoing">Ongoing</option>
                                <option value="past">Past / Completed</option>
                            </select>
                        </div>

                        {isAuthenticated && user?.role === 'participant' && (
                            <label className="flex items-center gap-2 text-sm font-medium mb-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filterFollowed}
                                    onChange={e => setFilterFollowed(e.target.checked)}
                                />
                                In Followed Clubs Only
                            </label>
                        )}
                    </div>

                    {/* Results Grid */}
                    {loading ? (
                        <div className="text-center mt-8">Loading events...</div>
                    ) : filteredEvents.length === 0 ? (
                        <div className="surface text-center text-muted py-12">
                            <Filter size={32} className="mx-auto mb-4 opacity-50" />
                            No events found matching your current filters.
                        </div>
                    ) : (
                        <div style={styles.grid}>
                            {filteredEvents.map(e => <EventCard key={e._id} event={e} />)}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

// Reusable minimal event card
const EventCard = ({ event }) => (
    <div className="surface flex-col" style={{ gap: '1rem', height: '100%' }}>
        <div className="flex justify-between items-start">
            <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{event.name}</h3>
                <div className="text-xs font-medium text-muted">
                    By {event.organizer?.firstName || 'Unknown Club'}
                </div>
            </div>
            <span className={`badge ${event.type === 'merchandise' ? 'badge-warning' : 'badge-primary'}`}>
                {event.type}
            </span>
        </div>

        <p style={{ fontSize: '0.875rem', flex: 1 }} className="line-clamp-3">
            {event.description}
        </p>

        <div className="flex-col gap-2" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {event.type === 'normal' && event.venue && (
                <div className="flex items-center gap-2">
                    <span className="font-medium">Venue:</span> {event.venue}
                </div>
            )}
            <div className="flex items-center gap-2">
                <CalendarDays size={16} />
                {whenText(event)}
            </div>
            {event.registrationLimit && (
                <div className="flex items-center gap-2">
                    <Users size={16} />
                    Limit: {event.registrationLimit} slots
                </div>
            )}
        </div>

        <div className="mt-4">
            <Link to={`/events/${event._id}`} className="btn btn-primary w-full text-center">
                Explore Event
            </Link>
        </div>
    </div>
);

const styles = {
    hero: {
        textAlign: 'center',
        padding: '4rem 2rem',
        backgroundColor: 'var(--surface-color)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '2rem'
    }
};

export default LandingPage;
