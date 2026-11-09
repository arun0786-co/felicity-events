import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { Camera, Check, XCircle } from 'lucide-react';
import jsQR from 'jsqr';

// Using a simplified mock UI for scanning, 
// as native hardware access via iframe in sandbox is tricky. Let's make it intuitive.
const QRScannerPage = () => {
    const { eventId } = useParams();
    const [dashboard, setDashboard] = useState(null);
    const [codeInput, setCodeInput] = useState('');
    const [overrideNotice, setOverrideNotice] = useState('');
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchDashboard();
        // Poll dashboard every 10 seconds for real-time feel
        const interval = setInterval(fetchDashboard, 10000);
        return () => clearInterval(interval);
    }, [eventId]);

    const fetchDashboard = async () => {
        try {
            const { data } = await api.get(`/events/${eventId}/attendance-dashboard`);
            setDashboard(data);
        } catch {
            toast.error('Failed to load dashboard.');
        } finally {
            setLoading(false);
        }
    };

    const processScan = async (override = false) => {
        if (!codeInput) return toast.error("Enter a code to scan");

        setIsProcessing(true);
        try {
            await api.post(`/events/${eventId}/qr-scan`, {
                qrData: codeInput.trim(),
                manualOverride: override,
                overrideNote: override ? overrideNotice : ''
            });
            toast.success('Attendance Scanned Successfully!');
            setCodeInput('');
            setOverrideNotice('');
            fetchDashboard();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Scan failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadCSV = async () => {
        try {
            const response = await api.get(`/events/${eventId}/attendance-export`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `attendance_${eventId}.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch {
            toast.error('Export failed');
        }
    };

    const handleQRUpload = (e) => {
        const file = e.files ? e.files[0] : e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, img.width, img.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    let extCode = code.data;
                    try {
                        const parsed = JSON.parse(extCode);
                        if (parsed.ticketId) extCode = parsed.ticketId;
                    } catch {
                        // not JSON: the code is the ticket id itself
                    }

                    setCodeInput(extCode);
                    toast.success("QR Code Decoded! Ready to process.");
                } else {
                    toast.error("No QR code found in the image.");
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="grid grid-cols-2 gap-8">
            {/* Scanner Simulator */}
            <div className="flex-col gap-4">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="mb-0">QR Scanner</h2>
                    <Link to="/dashboard" className="btn btn-outline">Exit</Link>
                </div>
                <div className="surface flex-col items-center p-8 bg-slate-900 border-none">
                    <Camera size={64} className="text-white mb-4 opacity-50" />
                    <p className="text-white text-center opacity-70 mb-6">
                        Upload a QR Code screenshot or paste the raw Ticket ID directly.
                    </p>

                    <div className="form-group w-full mb-0 text-left">
                        <label className="form-label text-sm text-white opacity-80 mb-2">Upload QR Image</label>
                        <input
                            type="file"
                            accept="image/*"
                            className="form-input text-center text-sm mb-4 text-white"
                            onChange={handleQRUpload}
                        />
                        <div className="text-center text-white opacity-50 my-2 text-sm font-semibold">-- OR --</div>
                        <input
                            type="text"
                            className="form-input text-center font-mono mt-2"
                            placeholder="Paste Ticket ID..."
                            value={codeInput}
                            onChange={(e) => setCodeInput(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => processScan(false)}
                        className="btn btn-primary mt-4 w-full justify-center py-3"
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Processing Scan...' : 'Process Ticket Scan'}
                    </button>
                </div>

                {/* Manual Override Tools */}
                <div className="surface mt-4 border-dashed border-2">
                    <h3 className="mb-2 text-md flex items-center gap-2 text-danger">
                        <XCircle size={18} /> Manual Override Options
                    </h3>
                    <p className="text-sm text-muted mb-4">Force a ticket ID to be stamped as attended regardless of state.</p>

                    <div className="form-group mb-4">
                        <input
                            type="text"
                            className="form-input text-sm"
                            placeholder="Override Justification (e.g. VIP List)"
                            value={overrideNotice}
                            onChange={(e) => setOverrideNotice(e.target.value)}
                        />
                    </div>

                    <button onClick={() => processScan(true)} className="btn btn-danger w-full justify-center">
                        Force Manual Entry
                    </button>
                </div>
            </div>

            {/* Live Dashboard Panel */}
            <div className="surface">
                <div className="flex justify-between items-center mb-6">
                    <h3>Live Dashboard</h3>
                    <button onClick={downloadCSV} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                        Export CSV
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 text-center border-b pb-6">
                    <div>
                        <div className="text-3xl font-bold text-main">{dashboard?.summary?.scanned}</div>
                        <div className="text-sm text-muted">Checked In</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-main">{dashboard?.summary?.percentage}%</div>
                        <div className="text-sm text-muted">Turnout</div>
                    </div>
                </div>

                <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Recent Scans</h4>
                <div className="flex-col gap-2 max-h-96 overflow-y-auto">
                    {dashboard?.scannedList?.slice(0, 10).map((reg, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 rounded" style={{ backgroundColor: '#F8FAFC' }}>
                            <div className="flex items-center gap-2">
                                <Check size={16} className="text-secondary" />
                                <span className="font-medium">{reg.user?.firstName} {reg.user?.lastName}</span>
                            </div>
                            <span className="text-xs text-muted" title={reg.ticketId}>{reg.ticketId?.substring(0, 6)}...</span>
                        </div>
                    ))}
                    {dashboard?.scannedList?.length === 0 && (
                        <p className="text-center text-sm text-muted">No tickets scanned yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QRScannerPage;
