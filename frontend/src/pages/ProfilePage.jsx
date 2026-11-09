import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { User, ShieldAlert, KeyRound } from 'lucide-react';

const ProfilePage = () => {
    const { user, isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        contactNumber: '',
        college: '',
        interests: '',
        category: '',
        description: '',
        discordWebhook: ''
    });

    useEffect(() => {
        if (isAuthenticated) fetchProfile();
    }, [isAuthenticated]);

    const fetchProfile = async () => {
        try {
            const { data } = await api.get('/users/me');
            const u = data.user;
            setFormData({
                firstName: u.firstName || '',
                lastName: u.lastName || '',
                contactNumber: u.contactNumber || '',
                college: u.college || '',
                interests: u.interests ? u.interests.join(', ') : '',
                category: u.category || '',
                description: u.description || '',
                discordWebhook: u.discordWebhook || ''
            });
        } catch {
            toast.error('Failed to load profile data.');
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...formData };
            if (user.role === 'participant') {
                payload.interests = formData.interests.split(',').map(i => i.trim()).filter(i => i);
            }
            await api.patch('/users/preferences', payload);
            toast.success('Profile updated successfully!');
            fetchProfile(); // Refresh context if needed
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordResetRequest = async () => {
        try {
            await api.post('/organizer/password-reset/request', { reason: "Requested via Profile UI" });
            toast.success('Password reset request sent to Admin successfully.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to request password reset.');
        }
    };

    if (loading) return <div>Loading profile...</div>;

    return (
        <div className="flex-col gap-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
                <User size={32} className="text-primary" />
                <h1 style={{ margin: 0, fontSize: '2rem' }}>My Profile</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Left Col: Account Info Display */}
                <div className="col-span-1 flex-col gap-4">
                    <div className="surface">
                        <h3 className="mb-4">Account Details</h3>
                        <div className="text-sm text-muted mb-2">Email Address (Non-Editable)</div>
                        <div className="p-3 bg-slate-50 border rounded mb-4 font-medium">{user.email}</div>

                        <div className="text-sm text-muted mb-2">Role</div>
                        <div className="mb-4">
                            <span className="badge badge-primary">{user.role.toUpperCase()}</span>
                        </div>

                        {user.role === 'participant' && (
                            <>
                                <div className="text-sm text-muted mb-2">Participant Type</div>
                                <div className="mb-4">
                                    <span className="badge">{user.participantType || 'Standard'}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Organizer Password Reset Mechanism */}
                    {user.role === 'organizer' && (
                        <div className="surface border-warning" style={{ borderColor: 'var(--warning-color)' }}>
                            <div className="flex items-center gap-2 mb-2 text-warning">
                                <KeyRound size={20} />
                                <h3 style={{ margin: 0 }}>Security</h3>
                            </div>
                            <p className="text-sm text-muted mb-4">
                                Need to change your password? Organizers must request a reset from the system admin.
                            </p>
                            <button className="btn btn-outline w-full" onClick={handlePasswordResetRequest}>
                                Request Password Reset
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Col: Edit Form */}
                <div className="col-span-2">
                    <form onSubmit={handleSaveProfile} className="surface flex-col gap-4">
                        <h3 className="mb-4">Personal Information</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <label className="form-label">First Name</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    className="form-input"
                                    value={formData.firstName}
                                    onChange={handleFormChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    className="form-input"
                                    value={formData.lastName}
                                    onChange={handleFormChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <label className="form-label">Contact Number</label>
                                <input
                                    type="text"
                                    name="contactNumber"
                                    className="form-input"
                                    value={formData.contactNumber}
                                    onChange={handleFormChange}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">College / Organization</label>
                                <input
                                    type="text"
                                    name="college"
                                    className="form-input"
                                    value={formData.college}
                                    onChange={handleFormChange}
                                />
                            </div>
                        </div>

                        {user.role === 'participant' && (
                            <div className="form-group mb-4">
                                <label className="form-label">Interests (Comma separated)</label>
                                <input
                                    type="text"
                                    name="interests"
                                    className="form-input"
                                    placeholder="Tech, Design, Sports"
                                    value={formData.interests}
                                    onChange={handleFormChange}
                                />
                            </div>
                        )}

                        {user.role === 'organizer' && (
                            <>
                                <h3 className="mb-4 mt-6">Club / Organization Details</h3>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <input
                                        type="text"
                                        name="category"
                                        className="form-input"
                                        placeholder="Technical, Cultural, Sports..."
                                        value={formData.category}
                                        onChange={handleFormChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        name="description"
                                        className="form-input"
                                        rows="3"
                                        placeholder="What does your club do?"
                                        value={formData.description}
                                        onChange={handleFormChange}
                                    />
                                </div>
                                <div className="form-group border-t pt-4 mt-4">
                                    <h3 className="mb-4">Integrations</h3>
                                    <label className="form-label">Discord Webhook (URL)</label>
                                    <input
                                        type="url"
                                        name="discordWebhook"
                                        className="form-input"
                                        placeholder="https://discord.com/api/webhooks/..."
                                        value={formData.discordWebhook}
                                        onChange={handleFormChange}
                                    />
                                    <p className="text-xs text-muted mt-1">If provided, new events will be automatically posted to this Discord channel.</p>
                                </div>
                            </>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                            style={{ alignSelf: 'flex-start' }}
                        >
                            {saving ? 'Saving Changes...' : 'Save Profile'}
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
};

export default ProfilePage;
