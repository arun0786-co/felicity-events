import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { Star, Filter } from 'lucide-react';

const ViewFeedbackPage = () => {
    const { eventId } = useParams();
    const [eventData, setEventData] = useState(null);
    const [feedbackData, setFeedbackData] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterRating, setFilterRating] = useState('all');

    useEffect(() => {
        fetchData();
    }, [eventId, filterRating]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterRating !== 'all') {
                params.minRating = filterRating;
                params.maxRating = filterRating;
            }

            const [{ data: eventRes }, { data: feedRes }] = await Promise.all([
                api.get(`/events/${eventId}`),
                api.get(`/feedback/${eventId}`, { params })
            ]);

            setEventData(eventRes.event);
            setFeedbackData(feedRes.feedback || []);
            setSummary(feedRes.summary);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load feedback');
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (rating) => {
        return (
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                    <Star
                        key={star}
                        size={16}
                        fill={rating >= star ? "#fbbf24" : "transparent"}
                        color={rating >= star ? "#fbbf24" : "#cbd5e1"}
                    />
                ))}
            </div>
        );
    };

    if (loading && !eventData) return <div>Loading...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="mb-2">Event Feedback</h2>
                    <p className="text-muted mb-2">
                        {eventData?.name}
                    </p>
                </div>
                <Link to="/dashboard" className="btn btn-outline">Back</Link>
            </div>

            <div className="grid grid-cols-4 gap-6 mb-6">
                <div className="surface flex-col items-center justify-center p-6 text-center">
                    <h1 className="text-4xl text-primary font-bold mb-2">{summary?.averageRating || '0.0'}</h1>
                    <p className="text-muted text-sm uppercase tracking-wider">Average Rating</p>
                </div>
                <div className="surface flex-col items-center justify-center p-6 text-center">
                    <h1 className="text-4xl text-main font-bold mb-2">{summary?.totalFeedback || 0}</h1>
                    <p className="text-muted text-sm uppercase tracking-wider">Total Responses</p>
                </div>

                <div className="surface flex items-center p-6" style={{ gridColumn: 'span 2' }}>
                    <div className="flex-1">
                        <label className="form-label text-sm flex items-center gap-2 mb-2"><Filter size={16} /> Filter by Rating</label>
                        <select
                            className="form-select mb-0"
                            value={filterRating}
                            onChange={(e) => setFilterRating(e.target.value)}
                        >
                            <option value="all">All Ratings</option>
                            <option value="5">5 Stars</option>
                            <option value="4">4 Stars</option>
                            <option value="3">3 Stars</option>
                            <option value="2">2 Stars</option>
                            <option value="1">1 Star</option>
                        </select>
                    </div>
                </div>
            </div>

            <h3 className="mb-4">Responses</h3>
            {loading ? (
                <p>Refreshing...</p>
            ) : feedbackData.length === 0 ? (
                <div className="surface text-center py-12 text-muted">
                    No feedback found for the selected criteria.
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {feedbackData.map(fb => (
                        <div key={fb._id} className="surface p-4 border border-slate-200">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="font-semibold">{fb.isAnonymous ? 'Anonymous' : `${fb.user?.firstName} ${fb.user?.lastName}`}</div>
                                    <div className="text-xs text-muted mb-2">{new Date(fb.createdAt).toLocaleDateString()}</div>
                                </div>
                                {renderStars(fb.rating)}
                            </div>
                            <p className="text-sm mt-2">{fb.comment || <span className="text-muted italic">No comment provided.</span>}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ViewFeedbackPage;
