import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useParkingStore } from '../store/useParkingStore';
import { useAuthStore } from '../store/useAuthStore';
import { DashboardHeader } from '../components/DashboardHeader';
import { CountdownCard } from '../components/CountdownCard';
import { ParkingLot } from '../components/ParkingLot';
import { ReservationModal } from '../components/ReservationModal';
import { CancellationModal } from '../components/CancellationModal';
import { useMyReservation } from '../hooks/useReservations';
import { FloorTabs } from '../components/FloorTabs';
import { ManagerReleaseModal } from '../components/ManagerReleaseModal';
import { ReservationHistory } from '../components/ReservationHistory';
import { formatDisplayDate } from '../utils/date';
import { api } from '../services/api';
import type { Notification } from '../types';

export function DashboardPage() {
  const { user } = useAuthStore();
  const { 
    tomorrowDate,
    todayDate,
    selectedDate,
    setSelectedDate,
    todayAvailability,
    fetchTodayAvailability,
    fetchFloors, 
    fetchSlots, 
    fetchReservations, 
    fetchManagerReleases,
    selectedFloorId,
    isLoading 
  } = useParkingStore();
  
  const myReservation = useMyReservation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);

  useEffect(() => {
    fetchFloors();
    fetchTodayAvailability();
  }, [fetchFloors, fetchTodayAvailability]);

  useEffect(() => {
    const fetchNotifs = () => {
      if (user && user.role === 'employee') {
        api.reservations.getNotifications()
          .then(data => {
            setNotifications(data);
            if (data.length > 0 && !currentNotification) {
              setCurrentNotification(data[0]);
            }
          })
          .catch(err => console.error("Error fetching notifications:", err));
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [user, currentNotification]);

  useEffect(() => {
    fetchSlots(); // Always fetch all slots so that global statistics are correct
  }, [fetchSlots]);

  useEffect(() => {
    if (selectedDate) {
      fetchReservations(selectedDate);
      fetchManagerReleases(selectedDate);
      
      const interval = setInterval(() => {
        fetchSlots();
        fetchFloors();
        fetchReservations(selectedDate);
        fetchManagerReleases(selectedDate);
        fetchTodayAvailability();
      }, 30_000);
      return () => clearInterval(interval);
    }
  }, [selectedDate, fetchReservations, fetchManagerReleases, fetchSlots, fetchFloors, fetchTodayAvailability]);

  return (
    <>
      <main
        className="app-container"
        style={{
          flex: 1,
          margin: '0 auto',
          padding: '40px 24px 60px',
        }}
      >
        {isLoading && (
          <div
            style={{
              position: 'fixed',
              top: '64px',
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, transparent, #1E3A5F, transparent)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
              zIndex: 40,
            }}
          />
        )}
        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <DashboardHeader />

          {/* Today's Availability Alert Banner */}
          {selectedDate === tomorrowDate && todayAvailability && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: todayAvailability.available > 0
                  ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)'
                  : 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                border: todayAvailability.available > 0
                  ? '1px solid #10B981'
                  : '1px solid #CBD5E1',
                borderRadius: '16px',
                padding: '16px 24px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: todayAvailability.available > 0
                  ? '0 4px 15px rgba(16, 185, 129, 0.08)'
                  : '0 4px 15px rgba(148, 163, 184, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: todayAvailability.available > 0 ? '#10B981' : '#64748B',
                  color: 'white',
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Calendar size={16} />
                </div>
                <div>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: todayAvailability.available > 0 ? '#065F46' : '#334155',
                    margin: 0
                  }}>
                    {todayAvailability.available > 0 ? "Today's slots are available!" : "Today's slots are fully reserved"}
                  </h4>
                  <p style={{
                    fontSize: '13px',
                    color: todayAvailability.available > 0 ? '#047857' : '#475569',
                    margin: '2px 0 0 0'
                  }}>
                    {todayAvailability.available > 0 ? (
                      <>There are <strong>{todayAvailability.available} / {todayAvailability.total}</strong> slots available for today.</>
                    ) : (
                      <>All <strong>{todayAvailability.total}</strong> slots are reserved for today. You can still view the slot status.</>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDate(todayDate)}
                style={{
                  background: todayAvailability.available > 0 ? '#10B981' : '#64748B',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: todayAvailability.available > 0
                    ? '0 2px 4px rgba(16, 185, 129, 0.15)'
                    : '0 2px 4px rgba(100, 116, 139, 0.15)',
                  transition: 'background-color 150ms',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = todayAvailability.available > 0 ? '#059669' : '#475569'}
                onMouseLeave={(e) => e.currentTarget.style.background = todayAvailability.available > 0 ? '#10B981' : '#64748B'}
              >
                {todayAvailability.available > 0 ? 'View & Book Today' : 'View Today'}
              </button>
            </motion.div>
          )}

          {/* Viewing Today Banner */}
          {selectedDate === todayDate && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                border: '1px solid #BFDBFE',
                borderRadius: '16px',
                padding: '16px 24px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: '0 4px 15px rgba(30, 58, 95, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#1E3A5F', color: 'white', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1E3A5F', margin: 0 }}>Viewing Today's Parking Slots</h4>
                  <p style={{ fontSize: '13px', color: '#4A6FA5', margin: '2px 0 0 0' }}>
                    You are currently booking slots for <strong>today</strong>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDate(tomorrowDate)}
                style={{
                  background: '#1E3A5F',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(30, 58, 95, 0.15)',
                  transition: 'background-color 150ms',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#172D4B'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#1E3A5F'}
              >
                Switch to Tomorrow
              </button>
            </motion.div>
          )}

          {myReservation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                background: 'linear-gradient(135deg, #EEF4FF 0%, #E0E7FF 100%)',
                border: '1px solid #C7D2FE',
                borderRadius: '12px',
                padding: '14px 20px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#1E3A5F',
                  flexShrink: 0,
                }}
              />
              <p style={{ fontSize: '14px', color: '#1E3A5F', fontWeight: '500' }}>
                You have a reservation for{' '}
                <strong>{myReservation.slot_id}</strong> on <strong>{formatDisplayDate(myReservation.date)}</strong>.{' '}
                <span style={{ color: '#4A6FA5' }}>Click your spot to release / cancel it.</span>
              </p>
            </motion.div>
          )}

          <CountdownCard />

          <div style={{ marginTop: '32px' }}>
            <FloorTabs />
            <ParkingLot />
          </div>
          
          <ReservationHistory />
        </motion.div>
      </main>

      <ReservationModal />
      <CancellationModal />
      <ManagerReleaseModal />

      {currentNotification && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #E2E8F0',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            
            <h3 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#0F172A',
              marginBottom: '10px'
            }}>
              Reservation Reclaimed
            </h3>
            
            <p style={{
              fontSize: '14px',
              color: '#475569',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
              {currentNotification.message}
            </p>
            
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.reservations.markNotificationRead(currentNotification.id);
                    setNotifications(prev => prev.filter(n => n.id !== currentNotification.id));
                    setCurrentNotification(null);
                  } catch (err) {
                    console.error("Error dismissing notification:", err);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
              
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.reservations.markNotificationRead(currentNotification.id);
                    const match = currentNotification.message.match(/for (\d{2})\/(\d{2})\/(\d{4})/);
                    if (match) {
                      const day = match[1];
                      const month = match[2];
                      const year = match[3];
                      const isoDate = `${year}-${month}-${day}`;
                      setSelectedDate(isoDate);
                    }
                    setNotifications(prev => prev.filter(n => n.id !== currentNotification.id));
                    setCurrentNotification(null);
                  } catch (err) {
                    console.error("Error redirecting notification:", err);
                  }
                }}
                style={{
                  flex: 1.5,
                  padding: '11px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#1E3A5F',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Book Another Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
