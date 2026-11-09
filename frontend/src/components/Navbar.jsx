import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, User, LogOut, LayoutDashboard } from 'lucide-react';

const Navbar = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav style={styles.nav}>
            <div style={styles.container}>
                <Link to="/" style={styles.logo}>
                    <Calendar size={24} color="var(--primary)" />
                    <span>Felicity Events</span>
                </Link>
                <div style={styles.linkGroup}>
                    {!isAuthenticated ? (
                        <>
                            <Link to="/" className="btn btn-ghost">Browse Events</Link>
                            <Link to="/login" className="btn btn-ghost">Login</Link>
                            <Link to="/register" className="btn btn-primary">Sign Up</Link>
                        </>
                    ) : (
                        <>
                            {user?.role === 'participant' && (
                                <>
                                    <Link to="/dashboard" className="btn btn-ghost">Dashboard</Link>
                                    <Link to="/" className="btn btn-ghost">Browse Events</Link>
                                    <Link to="/organizers" className="btn btn-ghost">Clubs/Organizers</Link>
                                    <Link to="/profile" className="btn btn-ghost">Profile</Link>
                                </>
                            )}

                            {user?.role === 'organizer' && (
                                <>
                                    <Link to="/dashboard" className="btn btn-ghost">Dashboard</Link>
                                    <Link to="/events/create" className="btn btn-ghost">Create Event</Link>
                                    <Link to="/organized-events" className="btn btn-ghost">Ongoing Events</Link>
                                    <Link to="/profile" className="btn btn-ghost">Profile</Link>
                                </>
                            )}

                            {user?.role === 'admin' && (
                                <>
                                    <Link to="/dashboard" className="btn btn-ghost">Dashboard</Link>
                                    <Link to="/dashboard" className="btn btn-ghost">Manage Clubs</Link>
                                    <Link to="/admin/password-resets" className="btn btn-ghost">Password Resets</Link>
                                </>
                            )}

                            <div style={styles.userBadge}>
                                <User size={18} />
                                <span>{user?.firstName}</span>
                                <span className="badge badge-primary">{user?.role}</span>
                            </div>
                            <button onClick={handleLogout} className="btn btn-outline" style={{ border: 'none' }}>
                                <LogOut size={18} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

const styles = {
    nav: {
        backgroundColor: 'var(--surface-color)',
        borderBottom: '1px solid var(--border-color)',
        padding: '1rem 0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
    },
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logo: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '1.25rem',
        fontWeight: 700,
        color: 'var(--text-main)',
        textDecoration: 'none',
    },
    linkGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    },
    userBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        padding: '0.5rem 1rem',
        backgroundColor: '#F1F5F9',
        borderRadius: '2rem',
    }
};

export default Navbar;
