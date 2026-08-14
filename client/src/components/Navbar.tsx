import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, User, Building2, Key, Phone } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { COMPANY_NAME, APP_NAME } from '../constants';
import { isSpecialUser } from './ParkingSpace';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const { setShowChangePasswordModal, setCurrentView, specialView, setSpecialView } = useAppStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <header
      style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E4E7EC',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="app-container"
        style={{
          margin: '0 auto',
          padding: '0 24px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '48px', objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <span
              style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#101828',
                letterSpacing: '-0.01em',
              }}
            >
              {COMPANY_NAME}
            </span>
            <span
              style={{
                fontSize: '18px',
                fontWeight: '400',
                color: '#667085',
                marginLeft: '8px',
              }}
            >
              · {APP_NAME}
            </span>
          </div>
        </div>

        {/* Special User Options */}
        {isSpecialUser(user?.name) && (
          <div style={{ display: 'flex', gap: '8px', background: '#F2F4F7', padding: '4px', borderRadius: '10px' }}>
            <button
              onClick={() => {
                setSpecialView('hr');
                setCurrentView('dashboard');
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: specialView === 'hr' ? '#FFFFFF' : 'transparent',
                color: specialView === 'hr' ? '#1E3A5F' : '#667085',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: specialView === 'hr' ? '0 1px 3px rgba(16, 24, 40, 0.1)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              HR Dashboard
            </button>
            <button
              onClick={() => {
                setSpecialView('map');
                setCurrentView('dashboard');
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: specialView === 'map' ? '#FFFFFF' : 'transparent',
                color: specialView === 'map' ? '#1E3A5F' : '#667085',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: specialView === 'map' ? '0 1px 3px rgba(16, 24, 40, 0.1)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              Manage Parking
            </button>
          </div>
        )}

        {/* Profile Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            id="profile-button"
            onClick={() => setProfileOpen(!profileOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #E4E7EC',
              background: profileOpen ? '#F9FAFB' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 200ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
            onMouseLeave={(e) => (e.currentTarget.style.background = profileOpen ? '#F9FAFB' : '#FFFFFF')}
            aria-expanded={profileOpen}
            aria-haspopup="true"
          >
            {/* Avatar */}
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1E3A5F 0%, #4A6FA5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: '600',
                color: 'white',
                flexShrink: 0,
              }}
            >
              {user.avatar_initials}
            </div>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#344054' }}>
              {user.name.split(' ')[0] || user.email.split('@')[0]}
            </span>
            <ChevronDown
              size={14}
              color="#667085"
              style={{
                transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 200ms ease',
              }}
            />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: '300px',
                background: '#FFFFFF',
                border: '1px solid #E4E7EC',
                borderRadius: '12px',
                boxShadow: '0 12px 24px -4px rgba(16,24,40,0.12), 0 4px 8px -2px rgba(16,24,40,0.06)',
                overflow: 'hidden',
                animation: 'fadeSlideIn 150ms ease',
              }}
            >
              <style>{`
                @keyframes fadeSlideIn {
                  from { opacity: 0; transform: translateY(-6px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>

              {/* User info header */}
              <div style={{ padding: '16px', borderBottom: '1px solid #F2F4F7' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1E3A5F 0%, #4A6FA5 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'white',
                      flexShrink: 0,
                    }}
                  >
                    {user.avatar_initials}
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#101828',
                        lineHeight: '1.3',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '210px',
                      }}
                      title={user.name || 'Set Name'}
                    >
                      {user.name || 'Set Name'}
                    </p>
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#667085',
                        lineHeight: '1.3',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '210px',
                      }}
                      title={user.email}
                    >
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info rows */}
              <div style={{ padding: '8px' }}>
                {user.department && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      color: '#344054',
                      fontSize: '13px',
                    }}
                  >
                    <Building2 size={14} color="#667085" />
                    <span>{user.department}</span>
                  </div>
                )}
                {user.vehicle_number && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      color: '#344054',
                      fontSize: '13px',
                    }}
                  >
                    <User size={14} color="#667085" />
                    <span style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{user.vehicle_number}</span>
                  </div>
                )}
                {user.mobile_number && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      color: '#344054',
                      fontSize: '13px',
                    }}
                  >
                    <Phone size={14} color="#667085" />
                    <span>{user.mobile_number}</span>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #F2F4F7', padding: '8px' }}>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    setCurrentView('profile');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#344054',
                    transition: 'background 150ms ease',
                    marginBottom: '4px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <User size={14} color="#667085" />
                  My Profile
                </button>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    setShowChangePasswordModal(true);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#344054',
                    transition: 'background 150ms ease',
                    marginBottom: '4px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <Key size={14} color="#667085" />
                  Change Password
                </button>
                <button
                  id="logout-button"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#9B2335',
                    transition: 'background 150ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#FFF1F2')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
