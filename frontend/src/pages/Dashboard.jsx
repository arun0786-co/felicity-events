import React from 'react';
import { useAuth } from '../context/AuthContext';
import ParticipantDashboard from './ParticipantDashboard';
import OrganizerDashboard from './OrganizerDashboard';
import AdminDashboard from './AdminDashboard';

const Dashboard = () => {
    const { user } = useAuth();

    return (
        <div className="flex-col gap-8">
            <header className="flex justify-between items-center mb-4">
                <div>
                    <h1 style={{ fontSize: '2rem' }}>Welcome, {user.firstName}</h1>
                    <p className="mt-2 text-muted">Manage your events and registrations below.</p>
                </div>
            </header>

            {user.role === 'participant' && <ParticipantDashboard />}
            {user.role === 'organizer' && <OrganizerDashboard />}
            {user.role === 'admin' && <AdminDashboard />}
        </div>
    );
};

export default Dashboard;
