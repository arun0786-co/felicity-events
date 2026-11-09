import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Check } from 'lucide-react';

const ClubsOrganizersPage = () => {
    const { user, isAuthenticated } = useAuth();
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch public organizers list
                const orgRes = await api.get('/users/organizers');
                setOrganizers(orgRes.data.organizers || []);

                // If logged in, fetch current followed organizers
                if (isAuthenticated && user?.role === 'participant') {
                    const meRes = await api.get('/users/me');
                    setFollowing(meRes.data.user.followedOrganizers || []);
                }
            } catch (error) {
                toast.error('Failed to load organizers list');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [isAuthenticated, user]);

    const handleFollowToggle = async (orgId) => {
        try {
            let updatedFollowing = [...following];
            // Toggle logic
            if (updatedFollowing.includes(orgId)) {
                updatedFollowing = updatedFollowing.filter(id => id !== orgId);
            } else {
                updatedFollowing.push(orgId);
            }

            // Patch preferred array
            await api.patch('/users/preferences', { followedOrganizers: updatedFollowing });
            setFollowing(updatedFollowing);

            toast.success(updatedFollowing.includes(orgId) ? 'Followed Club!' : 'Unfollowed Club.');
        } catch (error) {
            toast.error('Failed to update follow preferences.');
        }
    };

    if (loading) return <div>Loading clubs and organizers...</div>;

    return (
        <div className="flex-col gap-8">
            <header className="flex items-center gap-3 mb-4">
                <Users size={32} className="text-primary" />
                <h1 style={{ margin: 0, fontSize: '2rem' }}>Clubs & Organizers</h1>
            </header>
            <p className="text-muted" style={{ maxWidth: '600px' }}>
                Browse all approved organizations, clubs, and Fest teams across the campus. Follow your favorites to personalize your event feed.
            </p>

            {organizers.length === 0 ? (
                <div className="surface text-center">No clubs or organizers found.</div>
            ) : (
                <div style={styles.grid}>
                    {organizers.map(org => {
                        const isFollowing = following.includes(org._id);
                        return (
                            <div key={org._id} className="surface flex-col justify-between" style={{ gap: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                                        {org.firstName} {org.lastName}
                                    </h3>
                                    <div className="text-sm text-muted">{org.email}</div>
                                </div>

                                {org.college && (
                                    <div className="text-sm">
                                        <strong>Affiliation:</strong> {org.college}
                                    </div>
                                )}

                                <div className="flex gap-4 mt-4">
                                    <Link
                                        to={`/organizers/${org._id}`}
                                        className="btn btn-outline"
                                        style={{ flex: 1, textAlign: 'center' }}
                                    >
                                        View Events
                                    </Link>

                                    {isAuthenticated && user?.role === 'participant' && (
                                        <button
                                            onClick={() => handleFollowToggle(org._id)}
                                            className={`btn ${isFollowing ? 'btn-primary' : 'btn-outline'}`}
                                            style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                                        >
                                            {isFollowing ? (
                                                <><Check size={16} /> Following</>
                                            ) : (
                                                <><UserPlus size={16} /> Follow</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const styles = {
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '2rem'
    }
};

export default ClubsOrganizersPage;
