import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Send, Pin, Trash2, Megaphone } from 'lucide-react';

const DiscussionForum = ({ eventId }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMessages();
        // Poll for real-time feel (every 10s)
        const interval = setInterval(fetchMessages, 10000);
        return () => clearInterval(interval);
    }, [eventId]);

    const fetchMessages = async () => {
        try {
            const { data } = await api.get(`/forum/${eventId}/messages`);
            setMessages(data.messages || []);
        } catch {
            console.error('Failed to load forum messages');
        } finally {
            setLoading(false);
        }
    };

    const handlePost = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await api.post(`/forum/${eventId}/messages`, { content: newMessage });
            setNewMessage('');
            fetchMessages();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to post message');
        }
    };

    const handleAnnouncement = async () => {
        if (!newMessage.trim()) return;
        try {
            await api.post(`/forum/${eventId}/announcement`, { content: newMessage });
            setNewMessage('');
            toast.success('Announcement posted');
            fetchMessages();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to post announcement');
        }
    };

    const handleDelete = async (msgId) => {
        if (!window.confirm("Delete this message?")) return;
        try {
            await api.delete(`/forum/${eventId}/messages/${msgId}`);
            fetchMessages();
        } catch {
            toast.error('Failed to delete message');
        }
    };

    const togglePin = async (msgId, currentPinStatus) => {
        try {
            await api.patch(`/forum/${eventId}/messages/${msgId}/pin`, { isPinned: !currentPinStatus });
            fetchMessages();
        } catch {
            toast.error('Failed to pin message');
        }
    };

    if (loading) return <div>Loading discussion...</div>;

    return (
        <div className="flex-col gap-4">
            {/* Message List */}
            <div className="flex-col gap-3 max-h-96 overflow-y-auto pr-2">
                {messages.length === 0 ? (
                    <p className="text-center text-muted text-sm py-4">No messages yet. Start the conversation!</p>
                ) : (
                    messages.map((msg) => (
                        <div key={msg._id} className={`p-4 rounded-lg border ${msg.isAnnouncement ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm">
                                        {msg.author?.firstName} {msg.author?.lastName}
                                    </span>
                                    {msg.author?.role === 'organizer' && (
                                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">Organizer</span>
                                    )}
                                    {msg.isPinned && (
                                        <span className="text-xs flex items-center gap-1 text-orange-600 font-medium">
                                            <Pin size={12} /> Pinned
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-muted">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</p>

                            {/* Moderation Controls (Organizer or Author) */}
                            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100 opacity-50 hover:opacity-100 transition-opacity">
                                {user?.role === 'organizer' && (
                                    <button onClick={() => togglePin(msg._id, msg.isPinned)} className="text-xs text-muted hover:text-orange-600 flex items-center gap-1 bg-transparent border-none cursor-pointer">
                                        <Pin size={14} /> {msg.isPinned ? 'Unpin' : 'Pin'}
                                    </button>
                                )}
                                {(user?.role === 'organizer' || user?.userId === msg.author?._id) && (
                                    <button onClick={() => handleDelete(msg._id)} className="text-xs text-muted hover:text-red-600 flex items-center gap-1 bg-transparent border-none cursor-pointer">
                                        <Trash2 size={14} /> Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input Form */}
            <form onSubmit={handlePost} className="mt-2 flex gap-2">
                <input
                    type="text"
                    className="form-input flex-1"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>
                    <Send size={18} />
                </button>
                {user?.role === 'organizer' && (
                    <button type="button" onClick={handleAnnouncement} className="btn btn-secondary" title="Post as Announcement" disabled={!newMessage.trim()}>
                        <Megaphone size={18} />
                    </button>
                )}
            </form>
        </div>
    );
};

export default DiscussionForum;
