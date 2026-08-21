import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Car, Calendar, MapPin } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useParkingStore } from '../store/useParkingStore';
import { formatDisplayDate } from '../utils/date';

export function ReservationModal() {
  const {
    showReservationModal,
    setShowReservationModal,
    selectedSlot,
    addToast,
  } = useAppStore();

  const { user } = useAuthStore();
  const { selectedDate, createReservation, isLoading } = useParkingStore();

  if (!user) return null;

  const [vehicleNumber, setVehicleNumber] = useState(user.vehicle_number);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setShowReservationModal(false);
    setVehicleNumber(user.vehicle_number);
  };

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setIsSubmitting(true);
    try {
      await createReservation(selectedSlot.id, vehicleNumber.trim());
      setShowReservationModal(false);
      setVehicleNumber(user.vehicle_number);
      addToast({ type: 'success', message: 'Reservation created successfully!' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to create reservation' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {showReservationModal && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(16, 24, 40, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
            }}
          />

          {/* Modal Wrapper to Center */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 101,
              padding: '0 16px',
              pointerEvents: 'none',
            }}
          >
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{
                width: '100%',
                maxWidth: '440px',
                pointerEvents: 'auto',
              }}
            >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                boxShadow: '0 24px 48px -12px rgba(16,24,40,0.25)',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #1E3A5F 0%, #2D5491 100%)',
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: 'white',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Reserve Parking
                  </h2>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                    Confirm your reservation details
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    transition: 'background 150ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                  aria-label="Close modal"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '24px' }}>
                {/* Info rows */}
                <div
                  style={{
                    background: '#F8F9FA',
                    borderRadius: '12px',
                    border: '1px solid #E4E7EC',
                    overflow: 'hidden',
                    marginBottom: '20px',
                  }}
                >
                  {[
                    {
                      icon: <Calendar size={15} color="#4A6FA5" />,
                      label: 'Date',
                      value: formatDisplayDate(selectedDate),
                    },
                    {
                      icon: <MapPin size={15} color="#4A6FA5" />,
                      label: 'Parking Slot',
                      value: selectedSlot ? `${selectedSlot.floor_id.replace('floor-', '').toUpperCase()} - ${selectedSlot.label}` : '—',
                      highlight: true,
                    },
                  ].map((item, i) => (
                    <div
                      key={item.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 16px',
                        borderBottom: i < 1 ? '1px solid #E4E7EC' : 'none',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#EEF2FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {item.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                          {item.label}
                        </p>
                        <p
                          style={{
                            fontSize: '14px',
                            fontWeight: item.highlight ? '700' : '500',
                            color: item.highlight ? '#1E3A5F' : '#344054',
                            marginTop: '2px',
                          }}
                        >
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vehicle number input */}
                <div style={{ marginBottom: '24px' }}>
                  <label
                    htmlFor="vehicle-number"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#344054',
                      marginBottom: '8px',
                    }}
                  >
                    <Car size={14} color="#667085" />
                    Vehicle Number
                  </label>
                  <input
                    id="vehicle-number"
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. MH 12 AB 3456"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #D1D5DB',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      letterSpacing: '0.08em',
                      color: '#101828',
                      background: '#FFFFFF',
                      outline: 'none',
                      transition: 'border-color 150ms ease, box-shadow 150ms ease',
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

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    id="cancel-reservation-modal-btn"
                    onClick={handleClose}
                    style={{
                      flex: 1,
                      padding: '11px 20px',
                      borderRadius: '10px',
                      border: '1px solid #E4E7EC',
                      background: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#344054',
                      cursor: 'pointer',
                      transition: 'background 150ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-reservation-btn"
                    onClick={handleConfirm}
                    disabled={isSubmitting || !vehicleNumber.trim()}
                    style={{
                      flex: 2,
                      padding: '11px 20px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isSubmitting ? '#4A6FA5' : '#1E3A5F',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'white',
                      cursor: isSubmitting ? 'wait' : 'pointer',
                      transition: 'background 150ms ease, opacity 150ms ease',
                      opacity: !vehicleNumber.trim() ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting) e.currentTarget.style.background = '#172D4B';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmitting) e.currentTarget.style.background = '#1E3A5F';
                    }}
                  >
                    {isSubmitting ? 'Reserving…' : 'Confirm Reservation'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
