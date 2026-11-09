import React, { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { KeyRound, Check, X, Clock } from 'lucide-react';

const AdminPasswordResetsPage = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [comments, setComments] = useState({});

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const { data } = await api.get('/admin/password-reset/requests');
            setRequests(data.requests);
        } catch {
            toast.error('Failed to load password reset requests.');
        } finally {
            setLoading(false);
        }
    };

    const handleCommentChange = (id, value) => {
        setComments(prev => ({ ...prev, [id]: value }));
    };

    const handleAction = async (id, actionStatus) => {
        setProcessingId(id);
        const adminComment = comments[id] || '';

        try {
            const { data } = await api.patch(`/admin/password-reset/${id}`, {
                status: actionStatus,
                adminComment
            });

            if (actionStatus === 'approved') {
                toast.success(`Reset Approved! New Password: ${data.newPassword}`, { duration: 10000 });
                // In a real system, you might trigger an email here, but the rubric says Admin shares it with the organizer.
                alert(`IMPORTANT:\nPassword for ${data.organizerEmail} reset successfully.\n\nNEW PASSWORD: ${data.newPassword}\n\nPlease share this securely with the Organizer.`);
            } else {
                toast.success('Request rejected.');
            }

            fetchRequests(); // refresh state
        } catch (error) {
            toast.error(error.response?.data?.message || `Failed to ${actionStatus} request.`);
        } finally {
            setProcessingId(null);
            setComments(prev => ({ ...prev, [id]: '' }));
        }
    };

    if (loading) return <div>Loading reset requests...</div>;

    const pendingRequests = requests.filter(r => r.status === 'pending');
    const historyRequests = requests.filter(r => r.status !== 'pending');

    return (
        <div className="flex-col gap-8 max-w-5xl mx-auto">
            <header className="flex items-center gap-3">
                <KeyRound size={32} className="text-primary" />
                <h1 style={{ margin: 0, fontSize: '2rem' }}>Password Reset Requests</h1>
            </header>

            {/* Pending Requests */}
            <section className="surface flex-col gap-4">
                <div className="flex items-center gap-2 mb-2">
                    <Clock size={20} className="text-warning" />
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Pending Approval ({pendingRequests.length})</h2>
                </div>

                {pendingRequests.length === 0 ? (
                    <p className="text-muted">No pending requests at this time.</p>
                ) : (
                    <div className="flex-col gap-4">
                        {pendingRequests.map(r => (
                            <div key={r._id} className="p-4 border rounded bg-slate-50 flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.125rem' }}>
                                            {r.organizer?.firstName} {r.organizer?.lastName}
                                            <span className="text-sm font-normal text-muted ml-2">({r.organizer?.email})</span>
                                        </h3>
                                        <div className="text-sm text-muted mt-1">
                                            Requested: {new Date(r.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                    <span className="badge badge-warning">Pending</span>
                                </div>

                                {r.reason && (
                                    <div className="bg-white p-3 border rounded text-sm">
                                        <strong>Reason provided:</strong> {r.reason}
                                    </div>
                                )}

                                <div className="flex gap-4 items-end mt-2">
                                    <div className="flex-1 form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label text-sm">Admin Comment (Optional)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Reason for approval/rejection..."
                                            value={comments[r._id] || ''}
                                            onChange={(e) => handleCommentChange(r._id, e.target.value)}
                                        />
                                    </div>
                                    <button
                                        className="btn btn-outline border-danger text-danger flex items-center gap-2"
                                        onClick={() => handleAction(r._id, 'rejected')}
                                        disabled={processingId === r._id}
                                    >
                                        <X size={16} /> Reject
                                    </button>
                                    <button
                                        className="btn btn-primary flex items-center gap-2"
                                        onClick={() => handleAction(r._id, 'approved')}
                                        disabled={processingId === r._id}
                                    >
                                        <Check size={16} /> Approve & Generate
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* History Section */}
            <section className="surface flex-col gap-4">
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Request History</h2>

                {historyRequests.length === 0 ? (
                    <p className="text-muted">No processed requests yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-3">Organizer</th>
                                    <th className="p-3">Date Processed</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Admin Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyRequests.map(r => (
                                    <tr key={r._id} className="border-b last:border-0 hover:bg-slate-50">
                                        <td className="p-3">
                                            {r.organizer?.firstName} {r.organizer?.lastName}
                                            <div className="text-xs text-muted">{r.organizer?.email}</div>
                                        </td>
                                        <td className="p-3 text-sm">{new Date(r.processedAt).toLocaleString()}</td>
                                        <td className="p-3">
                                            <span className={`badge ${r.status === 'approved' ? 'badge-primary' : 'badge-danger'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-sm text-muted">{r.adminComment || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

export default AdminPasswordResetsPage;
