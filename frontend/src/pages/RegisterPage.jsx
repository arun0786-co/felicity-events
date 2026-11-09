import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        participantType: 'NON_IIIT',
        college: '',
        contactNumber: ''
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (formData.participantType === 'IIIT' && !formData.email.endsWith('@iiit.ac.in')) {
                toast.error('IIIT participants must use an @iiit.ac.in email address.');
                setLoading(false);
                return;
            }

            await api.post('/auth/register', formData);
            toast.success('Registration successful! Please log in.');
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center" style={{ minHeight: '80vh' }}>
            <div className="surface" style={{ width: '100%', maxWidth: '500px' }}>
                <div className="text-center mb-8">
                    <h2>Create Account</h2>
                    <p>Join Felicity Events</p>
                </div>

                <form onSubmit={handleRegister} className="flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group mb-0">
                            <label className="form-label">First Name</label>
                            <input type="text" className="form-input" name="firstName" required value={formData.firstName} onChange={handleChange} />
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Last Name</label>
                            <input type="text" className="form-input" name="lastName" required value={formData.lastName} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input type="email" className="form-input" name="email" required value={formData.email} onChange={handleChange} />
                        {formData.participantType === 'IIIT' && (
                            <span className="form-error">Must be an @iiit.ac.in address.</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input type="password" className="form-input" name="password" required value={formData.password} onChange={handleChange} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group mb-0">
                            <label className="form-label">Participant Type</label>
                            <select className="form-select" name="participantType" value={formData.participantType} onChange={handleChange}>
                                <option value="NON_IIIT">Non-IIIT Student</option>
                                <option value="IIIT">IIIT Student</option>
                            </select>
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Contact Number</label>
                            <input type="tel" className="form-input" name="contactNumber" value={formData.contactNumber} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">College / University</label>
                        <input type="text" className="form-input" name="college" value={formData.college} onChange={handleChange} />
                    </div>

                    <button type="submit" className="btn btn-primary mt-4" style={{ width: '100%' }} disabled={loading}>
                        <UserPlus size={18} />
                        {loading ? 'Registering...' : 'Sign Up'}
                    </button>
                </form>

                <p className="text-center mt-6" style={{ fontSize: '0.875rem' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Log in</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
