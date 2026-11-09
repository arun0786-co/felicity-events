import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

const EditEventPage = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [eventStatus, setEventStatus] = useState('draft');
    const [eventType, setEventType] = useState('normal');

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        venue: '',
        startDate: '',
        endDate: '',
        registrationDeadline: '',
        registrationLimit: '',
        registrationFee: 0,
        tags: '',
        stockQuantity: '',
    });

    const [variants, setVariants] = useState([{ name: '', stock: 0 }]);

    const handleAddVariant = () => setVariants([...variants, { name: '', stock: 0 }]);
    const handleRemoveVariant = (index) => setVariants(variants.filter((_, i) => i !== index));
    const handleVariantChange = (index, field, value) => {
        const newVariants = [...variants];
        newVariants[index][field] = value;
        setVariants(newVariants);
    };

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const { data } = await api.get(`/events/${eventId}`);
                const ev = data.event;

                setEventStatus(ev.status);
                setEventType(ev.type);

                const formatDate = (d) => d ? new Date(d).toISOString().slice(0, 16) : '';

                setFormData({
                    name: ev.name || '',
                    description: ev.description || '',
                    venue: ev.venue || '',
                    startDate: formatDate(ev.startDate),
                    endDate: formatDate(ev.endDate),
                    registrationDeadline: formatDate(ev.registrationDeadline),
                    registrationLimit: ev.registrationLimit || '',
                    registrationFee: ev.registrationFee || 0,
                    tags: ev.tags ? ev.tags.join(', ') : '',
                    stockQuantity: ev.stockQuantity || ''
                });

                if (ev.type === 'merchandise' && ev.merchandiseVariants && ev.merchandiseVariants.length > 0) {
                    setVariants(ev.merchandiseVariants);
                }
            } catch {
                toast.error('Failed to load event details');
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [eventId, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...formData };

            // Format appropriately
            if (payload.tags) {
                payload.tags = payload.tags.split(',').map(t => t.trim()).filter(Boolean);
            } else {
                payload.tags = [];
            }

            if (eventType === 'merchandise') {
                const validVariants = variants.filter(v => v.name.trim() !== '');
                if (validVariants.length === 0) {
                    setSaving(false);
                    return toast.error("Please provide at least one merchandise variant with stock.");
                }

                payload.merchandiseVariants = JSON.stringify(validVariants);
                delete payload.stockQuantity;
                delete payload.registrationLimit;
                delete payload.venue;
            } else {
                if (payload.registrationLimit) payload.registrationLimit = Number(payload.registrationLimit);
                delete payload.stockQuantity;
                delete payload.merchandiseVariants;
            }

            await api.put(`/events/${eventId}`, payload);
            toast.success('Event updated successfully');
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update event');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    const isPublished = eventStatus === 'published';
    const noEdit = ['ongoing', 'completed', 'closed'].includes(eventStatus);

    if (noEdit) {
        return (
            <div className="surface text-center p-8">
                <h2>Cannot Edit Event</h2>
                <p className="text-muted">This event is in "{eventStatus}" state and can no longer be edited.</p>
                <button onClick={() => navigate('/dashboard')} className="btn btn-primary mt-4">Return to Dashboard</button>
            </div>
        );
    }

    return (
        <div className="flex justify-center">
            <div className="surface" style={{ width: '100%', maxWidth: '800px' }}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="m-0">Edit Event</h2>
                    <span className={`badge ${isPublished ? 'badge-success' : 'badge-primary'}`}>
                        {eventStatus.toUpperCase()}
                    </span>
                </div>

                {isPublished && (
                    <div className="bg-blue-50 text-blue-800 p-4 rounded mb-6 text-sm">
                        This event is published. You can only edit select fields such as description, venue, dates, limits, and stock. Core attributes like Name and Eligibility are locked.
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex-col gap-4">
                    <div className="form-group">
                        <label className="form-label">Event Name</label>
                        <input type="text" className="form-input" name="name" required value={formData.name} onChange={handleChange} disabled={isPublished} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description *</label>
                        <textarea className="form-textarea" name="description" rows={3} required value={formData.description} onChange={handleChange} />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="form-group mb-0">
                            <label className="form-label">Start Date *</label>
                            <input type="datetime-local" className="form-input" name="startDate" required value={formData.startDate} onChange={handleChange} />
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">End Date *</label>
                            <input type="datetime-local" className="form-input" name="endDate" required value={formData.endDate} onChange={handleChange} />
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Registration Deadline</label>
                            <input type="datetime-local" className="form-input" name="registrationDeadline" value={formData.registrationDeadline} onChange={handleChange} />
                        </div>
                    </div>

                    {eventType === 'normal' && (
                        <>
                            <div className="form-group mb-4">
                                <label className="form-label">Venue / Location</label>
                                <input type="text" className="form-input" name="venue" value={formData.venue} onChange={handleChange} placeholder="e.g. Vindhya A3 114" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group mb-0">
                                    <label className="form-label">Registration Limit</label>
                                    <input type="number" className="form-input" name="registrationLimit" value={formData.registrationLimit} onChange={handleChange} min="1" />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">Tags (comma separated)</label>
                                    <input type="text" className="form-input" name="tags" value={formData.tags} onChange={handleChange} />
                                </div>
                            </div>
                        </>
                    )}

                    {eventType === 'merchandise' && (
                        <div className="flex-col gap-4 p-4 bg-orange-50 border border-orange-200 rounded">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group mb-0">
                                    <label className="form-label">Fee (₹) *</label>
                                    <input type="number" className="form-input" name="registrationFee" required value={formData.registrationFee} onChange={handleChange} min="0" disabled={isPublished} />
                                </div>
                            </div>

                            <hr className="border-orange-200" />
                            <div className="flex justify-between items-center">
                                <label className="form-label mb-0">Merchandise Variants</label>
                                <button type="button" onClick={handleAddVariant} className="btn py-1 px-2 text-xs bg-orange-200 text-orange-900 border-none rounded">
                                    + Add Variant
                                </button>
                            </div>

                            <div className="flex-col gap-2">
                                {variants.map((variant, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <div className="flex-1">
                                            <input
                                                type="text" className="form-input mb-0" placeholder="Variant Name (e.g. S - Red)"
                                                value={variant.name} onChange={(e) => handleVariantChange(idx, 'name', e.target.value)} required disabled={isPublished && variant.name.length > 0}
                                            />
                                        </div>
                                        <div className="w-1/3">
                                            <input
                                                type="number" className="form-input mb-0" placeholder="Active Stock Remaining" min="0"
                                                value={variant.stock === 0 && !isPublished ? '' : variant.stock} onChange={(e) => handleVariantChange(idx, 'stock', Number(e.target.value))} required
                                            />
                                        </div>
                                        {variants.length > 1 && !isPublished && (
                                            <button type="button" onClick={() => handleRemoveVariant(idx)} className="btn btn-outline text-danger border-none px-2 py-1">
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted">Adjust specific stock limits dynamically based on current orders above.</p>
                        </div>
                    )}

                    <div className="mt-8 flex justify-end gap-4">
                        <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-outline" disabled={saving}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditEventPage;
