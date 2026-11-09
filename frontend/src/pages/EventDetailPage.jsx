import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Calendar, MapPin, Tag, Users, CheckCircle } from 'lucide-react';
import DiscussionForum from '../components/DiscussionForum';
import FeedbackForm from '../components/FeedbackForm';

const EventDetailPage = () => {
  const { eventId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Registration states
  const [registering, setRegistering] = useState(false);
  const [formResponses, setFormResponses] = useState({});
  const [paymentProof, setPaymentProof] = useState('');
  const [merchandiseVariant, setMerchandiseVariant] = useState('');

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);
    } catch {
      toast.error('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to register.');
      return;
    }

    setRegistering(true);
    try {
      const payload = { formResponses };
      if (event.type === 'merchandise') {
        payload.paymentProof = paymentProof;
        if (merchandiseVariant) {
          payload.merchandiseVariant = merchandiseVariant;
        }
      }
      await api.post(`/events/${eventId}/register`, payload);
      toast.success('Successfully registered!');
      fetchEvent(); // refresh to show updated info if any
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Limit to 2MB
        toast.error("File is too large! Please upload an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProof(reader.result); // Save as Base64 format
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormChange = (label, value) => {
    setFormResponses(prev => ({ ...prev, [label]: value }));
  };

  if (loading) return <div>Loading event details...</div>;
  if (!event) return <div>Event not found</div>;

  return (
    <div className="flex-col gap-8">
      {/* Event Header */}
      <div className="surface">
        <div className="flex justify-between items-start mb-4">
          <h1 style={{ fontSize: '2.5rem', margin: 0 }}>{event.name}</h1>
          <span className={`badge ${event.type === 'merchandise' ? 'badge-warning' : 'badge-primary'}`} style={{ fontSize: '1rem', padding: '0.25rem 1rem' }}>
            {event.type.toUpperCase()}
          </span>
        </div>

        <p className="text-muted mb-6" style={{ fontSize: '1.125rem' }}>{event.description}</p>

        <div className="flex-col gap-3 text-muted mb-6 bg-slate-50 p-4 rounded border border-slate-200">
          {event.type === 'normal' && (
            <div className="flex items-center gap-2 font-medium text-gray-900 border-b pb-2 mb-1 border-slate-200">
              <MapPin size={20} className="text-primary" />
              <span style={{ fontSize: '1.1rem' }}>Venue: {event.venue || 'TBA'}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-800">
            <Calendar size={18} />
            <span className="font-medium">Date:</span>
            <span>{new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}</span>
          </div>
          {event.registrationLimit && (
            <div className="flex items-center gap-2 text-gray-800">
              <Users size={18} />
              <span className="font-medium">Limit:</span>
              <span>{event.registrationLimit} slots</span>
            </div>
          )}
          {event.eligibility && (
            <div className="flex items-center gap-2 text-gray-800">
              <CheckCircle size={18} />
              <span className="font-medium">Eligibility:</span>
              <span>{event.eligibility === 'IIIT_ONLY' ? 'IIIT Students Only' : 'Open to All'}</span>
            </div>
          )}
        </div>

        {event.tags && event.tags.length > 0 && (
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-muted" />
            <div className="flex gap-2">
              {event.tags.map(tag => (
                <span key={tag} className="badge">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-8">
        {/* Left Col: Info / Forum */}
        <div className="flex-col gap-8" style={{ gridColumn: 'span 2' }}>

          {/* Organizer Info */}
          <div className="surface">
            <h3 className="mb-4">Organizer</h3>
            <p className="font-medium text-main">{event.organizer?.firstName} {event.organizer?.lastName}</p>
            <p className="text-muted text-sm">{event.organizer?.email}</p>
          </div>

          {/* Forum Placeholder (Tier B) */}
          <div className="surface">
            <h3 className="mb-4">Discussion Forum</h3>
            {isAuthenticated ? (
              <DiscussionForum eventId={eventId} />
            ) : (
              <p className="text-muted text-sm border bg-slate-50 p-6 rounded text-center">Please log in to participate in the forum.</p>
            )}
          </div>

          {/* Feedback Form (Tier C) - Show if Event Completed */}
          {event.status === 'completed' && isAuthenticated && user?.role === 'participant' && (
            <FeedbackForm eventId={eventId} />
          )}

        </div>

        {/* Right Col: Registration Panel */}
        <div className="flex-col gap-4">
          <div className="surface" style={{ position: 'sticky', top: '100px' }}>
            <h3 className="mb-4">Registration</h3>

            {event.status !== 'published' ? (
              <div className="text-center p-4 bg-gray-50 rounded text-muted">
                Registration is closed for this event.
              </div>
            ) : (
              <form onSubmit={handleRegister} className="flex-col gap-4">

                {/* Custom Fields */}
                {event.customFields?.map(field => (
                  <div className="form-group" key={field.label}>
                    <label className="form-label">{field.label} {field.required && '*'}</label>
                    {field.type === 'boolean' ? (
                      <select
                        className="form-select"
                        required={field.required}
                        onChange={(e) => handleFormChange(field.label, e.target.value === 'true')}
                        value={formResponses[field.label] !== undefined ? formResponses[field.label] : ''}
                      >
                        <option value="">Select...</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        className="form-input"
                        required={field.required}
                        onChange={(e) => handleFormChange(field.label, e.target.value)}
                        value={formResponses[field.label] || ''}
                      />
                    )}
                  </div>
                ))}

                {/* Merchandise Payment Upload (Tier A Mock) */}
                {event.type === 'merchandise' && (
                  <>
                    <div className="p-4 mb-2 bg-blue-50 text-blue-800 rounded text-sm">
                      <strong>Fee: ₹{event.registrationFee || 0}</strong><br />
                      Pay via UPI to <em>felicity@upi</em>. Stock remaining: {event.stockQuantity}
                    </div>
                    {event.merchandiseVariants && event.merchandiseVariants.length > 0 && (
                      <div className="form-group">
                        <label className="form-label">Select Size/Variant *</label>
                        <select
                          className="form-select"
                          required
                          value={merchandiseVariant}
                          onChange={(e) => setMerchandiseVariant(e.target.value)}
                        >
                          <option value="">Choose variant...</option>
                          {event.merchandiseVariants.map(v => (
                            <option key={v.name} value={v.name} disabled={v.stock <= 0}>
                              {v.name} {v.stock > 0 ? `(${v.stock} left)` : '(Out of Stock)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">Payment Screenshot / Proof Upload *</label>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        required
                        className="form-input"
                        onChange={handleFileUpload}
                      />
                      {paymentProof && <p className="text-xs text-primary mt-1 flex items-center gap-1"><CheckCircle size={12} /> File attached</p>}
                    </div>
                  </>
                )}

                {!isAuthenticated ? (
                  <p className="text-sm text-center text-muted">Log in to register</p>
                ) : user.role === 'participant' ? (
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={registering}>
                    <CheckCircle size={18} />
                    {registering ? 'Processing...' : event.type === 'merchandise' ? 'Pre-order Item' : 'Register Now'}
                  </button>
                ) : (
                  <p className="text-sm text-center text-muted">Only participants can register.</p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
