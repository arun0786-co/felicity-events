import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

const CreateEventPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'normal',
        venue: '',
        eligibility: 'ALL',
        startDate: '',
        endDate: '',
        registrationDeadline: '',
        registrationLimit: '',
        registrationFee: 0,
        tags: '',
        stockQuantity: '',
        purchaseLimitPerUser: 1
    });

    const [variants, setVariants] = useState([{ name: '', stock: 0 }]);

    const handleAddVariant = () => setVariants([...variants, { name: '', stock: 0 }]);
    const handleRemoveVariant = (index) => setVariants(variants.filter((_, i) => i !== index));
    const handleVariantChange = (index, field, value) => {
        const newVariants = [...variants];
        newVariants[index][field] = value;
        setVariants(newVariants);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData };

            // Convert arrays/numbers
            if (payload.tags) {
                payload.tags = payload.tags.split(',').map(t => t.trim());
            } else {
                payload.tags = [];
            }

            if (payload.type === 'merchandise') {
                payload.purchaseLimitPerUser = Number(payload.purchaseLimitPerUser) || 1;

                // Cleanup and attach exactly structured variants
                const validVariants = variants.filter(v => v.name.trim() !== '');
                if (validVariants.length === 0) {
                    return toast.error("Please provide at least one merchandise variant with stock.");
                }

                // The backend now calculates `stockQuantity` from the sum of variants so we don't need to pass it
                payload.merchandiseVariants = JSON.stringify(validVariants);

                delete payload.stockQuantity;
                delete payload.registrationLimit;
                delete payload.venue;
            } else {
                if (payload.registrationLimit) payload.registrationLimit = Number(payload.registrationLimit);
                delete payload.stockQuantity;
                delete payload.purchaseLimitPerUser;
                delete payload.merchandiseVariants;
            }

            await api.post('/events', payload);
            toast.success('Event created in Draft mode. You can publish it from Dashboard.');
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center">
            <div className="surface" style={{ width: '100%', maxWidth: '800px' }}>
                <h2 className="mb-6">Create New Event</h2>

                <form onSubmit={handleSubmit} className="flex-col gap-4">
                    <div className="form-group">
                        <label className="form-label">Event Name *</label>
                        <input type="text" className="form-input" name="name" required value={formData.name} onChange={handleChange} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description *</label>
                        <textarea className="form-textarea" name="description" rows={3} required value={formData.description} onChange={handleChange} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label">Event Type</label>
                            <select className="form-select" name="type" value={formData.type} onChange={handleChange}>
                                <option value="normal">Normal Event</option>
                                <option value="merchandise">Merchandise / Pre-order</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Eligibility</label>
                            <select className="form-select" name="eligibility" value={formData.eligibility} onChange={handleChange}>
                                <option value="ALL">All Students</option>
                                <option value="IIIT_ONLY">IIIT Students Only</option>
                            </select>
                        </div>
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

                    {formData.type === 'normal' && (
                        <>
                            <div className="form-group mb-4">
                                <label className="form-label">Venue / Location *</label>
                                <input type="text" className="form-input" name="venue" required value={formData.venue} onChange={handleChange} placeholder="e.g. Vindhya A3 114" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group mb-0">
                                    <label className="form-label">Registration Limit (Optional)</label>
                                    <input type="number" className="form-input" name="registrationLimit" value={formData.registrationLimit} onChange={handleChange} min="1" />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">Tags (comma separated)</label>
                                    <input type="text" className="form-input" name="tags" value={formData.tags} onChange={handleChange} placeholder="e.g. Technical, Hackathon" />
                                </div>
                            </div>
                        </>
                    )}

                    {formData.type === 'merchandise' && (
                        <div className="flex-col gap-4 p-4 bg-orange-50 border border-orange-200 rounded">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group mb-0">
                                    <label className="form-label">Fee (₹) *</label>
                                    <input type="number" className="form-input" name="registrationFee" required value={formData.registrationFee} onChange={handleChange} min="0" />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">Limit Per User</label>
                                    <input type="number" className="form-input" name="purchaseLimitPerUser" value={formData.purchaseLimitPerUser} onChange={handleChange} min="1" />
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
                                                value={variant.name} onChange={(e) => handleVariantChange(idx, 'name', e.target.value)} required
                                            />
                                        </div>
                                        <div className="w-1/3">
                                            <input
                                                type="number" className="form-input mb-0" placeholder="Stock" min="1"
                                                value={variant.stock === 0 ? '' : variant.stock} onChange={(e) => handleVariantChange(idx, 'stock', Number(e.target.value))} required
                                            />
                                        </div>
                                        {variants.length > 1 && (
                                            <button type="button" onClick={() => handleRemoveVariant(idx)} className="btn btn-outline text-danger border-none px-2 py-1">
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted">Total Global Stock will be calculated automatically.</p>
                        </div>
                    )}

                    <div className="mt-8 flex justify-end gap-4">
                        <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-outline">Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Draft Event'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateEventPage;
