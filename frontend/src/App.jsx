import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// We will implement these pages next
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import EventDetailPage from './pages/EventDetailPage';
import CreateEventPage from './pages/CreateEventPage';
import ManageRegistrationsPage from './pages/ManageRegistrationsPage';
import QRScannerPage from './pages/QRScannerPage';
import ProfilePage from './pages/ProfilePage';
import ClubsOrganizersPage from './pages/ClubsOrganizersPage';
import OrganizerDetailPage from './pages/OrganizerDetailPage';
import AdminPasswordResetsPage from './pages/AdminPasswordResetsPage';
import ParticipantDashboard from './pages/ParticipantDashboard';
import EditEventPage from './pages/EditEventPage';
import ViewFeedbackPage from './pages/ViewFeedbackPage';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />; // Redirect if unauthorized role
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/events/:eventId" element={<EventDetailPage />} />

              {/* Central Dashboard Route */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />

              {/* Organizer Routes */}
              <Route path="/events/create" element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <CreateEventPage />
                </ProtectedRoute>
              } />

              <Route path="/events/:eventId/edit" element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <EditEventPage />
                </ProtectedRoute>
              } />

              <Route path="/events/:eventId/manage" element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <ManageRegistrationsPage />
                </ProtectedRoute>
              } />

              <Route path="/events/:eventId/feedback" element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <ViewFeedbackPage />
                </ProtectedRoute>
              } />

              <Route path="/events/:eventId/scanner" element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <QRScannerPage />
                </ProtectedRoute>
              } />

              <Route path="/profile" element={
                <ProtectedRoute allowedRoles={['participant', 'organizer']}>
                  <ProfilePage />
                </ProtectedRoute>
              } />

              <Route path="/organizers" element={
                <ProtectedRoute allowedRoles={['participant']}>
                  <ClubsOrganizersPage />
                </ProtectedRoute>
              } />

              <Route path="/organizers/:orgId" element={
                <ProtectedRoute allowedRoles={['participant']}>
                  <OrganizerDetailPage />
                </ProtectedRoute>
              } />

              <Route path="/admin/password-resets" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPasswordResetsPage />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
        </div>
        <Toaster position="bottom-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
