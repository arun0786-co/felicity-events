import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Star } from 'lucide-react';

const FeedbackForm = ({ eventId, customClass = "" }) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) return toast.error("Please select a star rating");

        setSubmitting(true);
        try {
            await api.post(`/feedback/${eventId}`, {
                rating,
                comment,
                isAnonymous
            });
            setSubmitted(true);
            toast.success('Feedback submitted!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit feedback');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className={`surface text-center p-6 ${customClass}`}>
                <h3 className="text-green-600 mb-2">Thank you!</h3>
                <p className="text-sm text-muted">Your feedback helps improve future events.</p>
            </div>
        );
    }

    return (
        <div className={`surface ${customClass}`}>
            <h3 className="mb-4">Leave Feedback</h3>
            <form onSubmit={handleSubmit} className="flex-col gap-4">

                {/* Star Rating */}
                <div className="flex items-center justify-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map(star => (
                        <button
                            key={star}
                            type="button"
                            className="bg-transparent border-none cursor-pointer"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                        >
                            <Star
                                size={32}
                                fill={(hoverRating || rating) >= star ? "#fbbf24" : "transparent"}
                                color={(hoverRating || rating) >= star ? "#fbbf24" : "#cbd5e1"}
                            />
                        </button>
                    ))}
                </div>

                <div className="form-group mb-0">
                    <textarea
                        className="form-textarea"
                        placeholder="Tell us what you thought... (optional)"
                        rows="3"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 mt-2">
                    <input
                        type="checkbox"
                        id="anon"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                    />
                    <label htmlFor="anon" className="text-sm text-muted cursor-pointer">Submit Anonymously</label>
                </div>

                <button type="submit" className="btn btn-primary mt-2 justify-center" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
            </form>
        </div>
    );
};

export default FeedbackForm;
