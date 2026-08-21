import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { ArrowLeft, User as UserIcon, Building2, Car, Mail, CheckCircle2, Phone, Camera } from 'lucide-react';

export function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { setCurrentView, addToast } = useAppStore();

  if (!user) return null;

  const [name, setName] = useState(user.name);
  const [department, setDepartment] = useState(user.department || '');
  const [vehicleNumber, setVehicleNumber] = useState(user.vehicle_number || '');
  const [mobileNumber, setMobileNumber] = useState(user.mobile_number || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', message: 'Image size should be less than 5MB.' });
      return;
    }

    setIsUploading(true);
    try {
      const updatedUser = await api.auth.uploadProfilePicture(file);
      setUser(updatedUser);
      addToast({ type: 'success', message: 'Profile picture updated successfully!' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to upload profile picture.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast({ type: 'error', message: 'Name cannot be empty.' });
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser = await api.auth.updateProfile({
        name: name.trim(),
        department: department.trim(),
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        mobile_number: mobileNumber.trim(),
      });
      setUser(updatedUser);
      addToast({ type: 'success', message: 'Profile updated successfully!' });
      setCurrentView('dashboard');
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main
      style={{
        flex: 1,
        maxWidth: '600px',
        width: '100%',
        margin: '0 auto',
        padding: '40px 24px 60px',
        boxSizing: 'border-box'
      }}
    >
      {/* Back link */}
      <button
        onClick={() => setCurrentView('dashboard')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          color: '#4A6FA5',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          padding: '8px 12px',
          borderRadius: '8px',
          marginLeft: '-12px',
          marginBottom: '24px',
          transition: 'all 150ms ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#EEF2FF';
          e.currentTarget.style.color = '#1E3A5F';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'none';
          e.currentTarget.style.color = '#4A6FA5';
        }}
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      {/* Profile Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#101828', letterSpacing: '-0.02em', margin: 0 }}>
          My Profile
        </h1>
        <p style={{ fontSize: '15px', color: '#667085', marginTop: '4px' }}>
          Manage your personal details and vehicle configuration.
        </p>
      </div>

      {/* Main Card */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E4E7EC',
          borderRadius: '20px',
          boxShadow: '0 4px 24px -4px rgba(16, 24, 40, 0.04)',
          overflow: 'hidden'
        }}
      >
        {/* Banner with initials avatar overlap */}
        <div style={{ height: '80px', background: 'linear-gradient(135deg, #1E3A5F 0%, #4A6FA5 100%)', position: 'relative' }} />
        
        <div style={{ padding: '24px', position: 'relative', marginTop: '-40px' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '4px solid #FFFFFF',
              boxShadow: '0 4px 12px rgba(16, 24, 40, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: '700',
              color: '#1E3A5F',
              marginBottom: '20px'
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: '#EEF2FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                cursor: isUploading ? 'not-allowed' : 'pointer',
              }}
              onClick={() => !isUploading && document.getElementById('avatar-input')?.click()}
            >
              {user.profile_picture_url ? (
                <img
                  src={user.profile_picture_url}
                  alt={user.name}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                user.avatar_initials
              )}
              
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  background: '#1E3A5F',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  border: '2px solid #FFFFFF',
                  opacity: isUploading ? 0.6 : 1,
                }}
              >
                <Camera size={14} color="#FFFFFF" />
              </div>
            </div>
            <input
              id="avatar-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarUpload}
              disabled={isUploading}
            />
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Full Name */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#344054',
                  marginBottom: '6px'
                }}
              >
                <UserIcon size={14} color="#667085" />
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  color: '#101828',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 150ms ease, box-shadow 150ms ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#1E3A5F';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,95,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Email (Disabled) */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#344054',
                  marginBottom: '6px'
                }}
              >
                <Mail size={14} color="#667085" />
                Email Address (Cannot change)
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #E4E7EC',
                  fontSize: '14px',
                  color: '#667085',
                  background: '#F9FAFB',
                  cursor: 'not-allowed',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Department */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#344054',
                  marginBottom: '6px'
                }}
              >
                <Building2 size={14} color="#667085" />
                Department / Team
              </label>
              <input
                type="text"
                placeholder="e.g. Engineering, Sales, HR"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  color: '#101828',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 150ms ease, box-shadow 150ms ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#1E3A5F';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,95,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Vehicle Number */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#344054',
                  marginBottom: '6px'
                }}
              >
                <Car size={14} color="#667085" />
                Vehicle Registration Number
              </label>
              <input
                type="text"
                placeholder="e.g. MH 12 AB 1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                  color: '#101828',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 150ms ease, box-shadow 150ms ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#1E3A5F';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,95,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#344054',
                  marginBottom: '6px'
                }}
              >
                <Phone size={14} color="#667085" />
                Mobile Number
              </label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  color: '#101828',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 150ms ease, box-shadow 150ms ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#1E3A5F';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,95,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSaving}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: '10px',
                border: 'none',
                background: isSaving ? '#4A6FA5' : '#1E3A5F',
                fontSize: '15px',
                fontWeight: '600',
                color: '#FFFFFF',
                cursor: isSaving ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '10px',
                transition: 'background 150ms ease'
              }}
              onMouseEnter={(e) => {
                if (!isSaving) e.currentTarget.style.background = '#172D4B';
              }}
              onMouseLeave={(e) => {
                if (!isSaving) e.currentTarget.style.background = '#1E3A5F';
              }}
            >
              <CheckCircle2 size={18} />
              {isSaving ? 'Saving Changes...' : 'Save Profile Details'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
