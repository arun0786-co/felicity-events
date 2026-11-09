import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Shield, UserPlus, Power, PowerOff } from 'lucide-react';

const AdminDashboard = () => {
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state for creating a new organizer
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        college: '',
        contactNumber: ''
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchOrganizers();
    }, []);

    const fetchOrganizers = async () => {
        try {
            const { data } = await api.get('/admin/organizers');
            setOrganizers(data.organizers);
        } catch {
            toast.error('Failed to load organizers');
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCreateOrganizer = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await api.post('/admin/organizers', formData);
            toast.success('Organizer created successfully');
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                password: '',
                college: '',
                contactNumber: ''
            });
            fetchOrganizers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create organizer');
        } finally {
            setCreating(false);
        }
    };

    const toggleOrganizerStatus = async (id, isActive) => {
        try {
            if (isActive) {
                await api.patch(`/admin/organizers/${id}/disable`);
                toast.success('Organizer disabled');
            } else {
                await api.patch(`/admin/organizers/${id}/enable`);
                toast.success('Organizer enabled');
            }
            fetchOrganizers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update organizer status');
        }
    };

    if (loading) return <div>Loading Admin Dashboard...</div>;

    return (
        <div className="flex-col gap-8">
            <div className="flex items-center gap-3">
                <Shield size={32} className="text-primary" />
                <h1 style={{ margin: 0, fontSize: '2rem' }}>Admin Dashboard</h1>
            </div>

            <div className="grid grid-cols-2 gap-8">
                {/* Create Organizer Panel */}
                <div className="surface">
                    <div className="flex items-center justify-between mb-6">
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Create Organizer</h2>
                        <UserPlus size={20} className="text-muted" />
                    </div>

                    <form onSubmit={handleCreateOrganizer} className="flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <label className="form-label">First Name *</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    required
                                    className="form-input"
                                    value={formData.firstName}
                                    onChange={handleFormChange}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name *</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    required
                                    className="form-input"
                                    value={formData.lastName}
                                    onChange={handleFormChange}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email Address *</label>
                            <input
                                type="email"
                                name="email"
                                required
                                className="form-input"
                                value={formData.email}
                                onChange={handleFormChange}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password *</label>
                            <input
                                type="password"
                                name="password"
                                required
                                className="form-input"
                                value={formData.password}
                                onChange={handleFormChange}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '1rem' }}
                            disabled={creating}
                        >
                            {creating ? 'Creating...' : 'Create Organizer Account'}
                        </button>
                    </form>
                </div>

                {/* Organizer Management Panel */}
                <div className="surface">
                    <h2 className="mb-6" style={{ fontSize: '1.25rem', margin: 0 }}>Manage Organizers</h2>

                    {organizers.length === 0 ? (
                        <p className="text-muted">No organizers found.</p>
                    ) : (
                        <div className="flex-col gap-4">
                            {organizers.map(org => (
                                <div key={org._id} className="border p-4 rounded flex justify-between items-center bg-slate-50">
                                    <div>
                                        <h4 style={{ margin: 0 }}>{org.firstName} {org.lastName}</h4>
                                        <div className="text-sm text-muted">{org.email}</div>
                                        <div className="mt-1">
                                            <span className={`badge ${org.isActive ? 'badge-primary' : 'badge-warning'}`}>
                                                {org.isActive ? 'Active' : 'Disabled'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        className={`btn ${org.isActive ? 'btn-danger' : 'btn-primary'} flex items-center gap-2`}
                                        onClick={() => toggleOrganizerStatus(org._id, org.isActive)}
                                        style={{ padding: '0.5rem 1rem' }}
                                    >
                                        {org.isActive ? (
                                            <><PowerOff size={16} /> Disable</>
                                        ) : (
                                            <><Power size={16} /> Enable</>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
