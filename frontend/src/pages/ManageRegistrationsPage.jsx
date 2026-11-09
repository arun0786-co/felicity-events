import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

const ManageRegistrationsPage = () => {
    const { eventId } = useParams();
    const [registrations, setRegistrations] = useState([]);
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [eventId]);

    const fetchData = async () => {
        try {
            const [{ data: eventRes }, { data: regRes }] = await Promise.all([
                api.get(`/events/${eventId}`),
                api.get(`/events/${eventId}/registrations`)
            ]);
            setEventData(eventRes.event);
            setRegistrations(regRes.registrations || []);
        } catch {
            toast.error('Failed to load data.');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentStatus = async (regId, status) => {
        try {
            await api.patch(`/events/${eventId}/registrations/${regId}/payment`, { status });
            toast.success(`Payment ${status} successfully`);
            fetchData(); // Refresh to get updated stock & status
        } catch (err) {
            toast.error(err.response?.data?.message || 'Update failed');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="mb-2">Manage Registrations</h2>
                    <p className="text-muted mb-2">
                        {eventData?.name} &bull; <span className={`badge ${eventData?.type === 'merchandise' ? 'badge-warning' : 'badge-primary'}`}>{eventData?.type}</span>
                    </p>
                    {eventData?.type === 'merchandise' && (
                        <div className="bg-orange-50 text-orange-900 border border-orange-200 rounded p-4 flex gap-4 mt-2">
                            <div>
                                <strong>Global Stock Remaining:</strong> {eventData.stockQuantity}
                            </div>
                            {eventData.merchandiseVariants && eventData.merchandiseVariants.length > 0 && (
                                <div className="flex gap-3 flex-wrap border-l border-orange-300 pl-4">
                                    {eventData.merchandiseVariants.map(v => (
                                        <div key={v.name} className="text-sm">
                                            <span className="font-semibold">{v.name}:</span> {v.stock}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <Link to="/dashboard" className="btn btn-outline">Back</Link>
            </div>

            <div className="surface p-0" style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                    <thead>
                        <tr style={styles.tr}>
                            <th style={styles.th}>Name</th>
                            <th style={styles.th}>Email</th>
                            <th style={styles.th}>College</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Attended</th>
                            {eventData?.type === 'merchandise' && <th style={styles.th}>Variant</th>}
                            {eventData?.type === 'merchandise' && <th style={styles.th}>Payment Status</th>}
                            <th style={styles.th}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {registrations.length === 0 && (
                            <tr><td colSpan="7" className="text-center p-4">No registrations found.</td></tr>
                        )}
                        {registrations.map(reg => (
                            <tr key={reg._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={styles.td}>{reg.user?.firstName} {reg.user?.lastName}</td>
                                <td style={styles.td}>{reg.user?.email}</td>
                                <td style={styles.td}>{reg.user?.college || 'N/A'}</td>
                                <td style={styles.td}>
                                    <span className={`badge ${reg.status === 'registered' ? 'badge-success' : 'badge-danger'}`}>
                                        {reg.status}
                                    </span>
                                </td>
                                <td style={styles.td}>{reg.attended ? 'Yes' : 'No'}</td>

                                {eventData?.type === 'merchandise' && <td style={styles.td}>{reg.merchandiseVariant || 'N/A'}</td>}

                                {eventData?.type === 'merchandise' && (
                                    <td style={styles.td}>
                                        {reg.paymentStatus === 'pending' && (
                                            <span className="badge badge-warning">Pending Review</span>
                                        )}
                                        {reg.paymentStatus === 'approved' && (
                                            <span className="badge badge-success">Approved</span>
                                        )}
                                        {reg.paymentStatus === 'rejected' && (
                                            <span className="badge badge-danger">Rejected</span>
                                        )}
                                        {reg.paymentProof && (
                                            <div className="text-sm mt-2">
                                                <a href={reg.paymentProof} target="_blank" rel="noreferrer" title="Click to view full screenshot">
                                                    <img src={reg.paymentProof} alt="Payment Proof" className="border border-slate-200 rounded" style={{ height: '40px', objectFit: 'contain' }} />
                                                    <span className="block text-xs mt-1 text-primary">View Proof</span>
                                                </a>
                                            </div>
                                        )}
                                    </td>
                                )}

                                <td style={styles.td} className="flex gap-2">
                                    {eventData?.type === 'merchandise' && reg.paymentStatus === 'pending' && (
                                        <>
                                            <button onClick={() => handlePaymentStatus(reg._id, 'approved')} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                                Approve
                                            </button>
                                            <button onClick={() => handlePaymentStatus(reg._id, 'rejected')} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                                Reject
                                            </button>
                                        </>
                                    )}
                                    {reg.formResponses && Object.keys(reg.formResponses).length > 0 && (
                                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                            onClick={() => alert(JSON.stringify(reg.formResponses, null, 2))}>
                                            View Form
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const styles = {
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left'
    },
    th: {
        padding: '1rem',
        backgroundColor: '#F8FAFC',
        borderBottom: '2px solid var(--border-color)',
        fontWeight: 600,
        fontSize: '0.875rem'
    },
    td: {
        padding: '1rem',
        fontSize: '0.875rem',
        verticalAlign: 'middle'
    }
};

export default ManageRegistrationsPage;
