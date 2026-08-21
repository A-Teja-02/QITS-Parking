import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Calendar, MapPin, Car } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useParkingStore } from '../store/useParkingStore';
import { useMyReservation } from '../hooks/useReservations';
import { formatDisplayDate } from '../utils/date';

export function CancellationModal() {
  const {
    showCancellationModal,
    setShowCancellationModal,
    selectedSlot,
  } = useAppStore();

  const { cancelReservation } = useParkingStore();
  const { addToast } = useAppStore();

  const myReservation = useMyReservation();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setShowCancellationModal(false);
    setIsConfirming(false);
  };

  const handleCancel = async () => {
    if (!myReservation) return;
    setIsSubmitting(true);
    try {
      await cancelReservation(myReservation.id);
      setShowCancellationModal(false);
      setIsConfirming(false);
      addToast({ type: 'success', message: 'Reservation cancelled successfully!' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to cancel reservation' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {showCancellationModal && (
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
                maxWidth: '420px',
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
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #F2F4F7',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: '#FFF1F2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AlertTriangle size={18} color="#9B2335" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#101828' }}>
                      Cancel / Release Reservation
                    </h2>
                    <p style={{ fontSize: '13px', color: '#667085' }}>
                      Slot {selectedSlot ? `${selectedSlot.floor_id.replace('floor-', '').toUpperCase()} - ${selectedSlot.label}` : ''} · Tomorrow
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#F9FAFB',
                    border: '1px solid #E4E7EC',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#667085',
                  }}
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '24px' }}>
                {myReservation && (
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
                        icon: <Calendar size={14} color="#4A6FA5" />,
                        label: 'Date',
                        value: formatDisplayDate(myReservation.date),
                      },
                      {
                        icon: <MapPin size={14} color="#4A6FA5" />,
                        label: 'Slot',
                        value: myReservation.slot_id,
                      },
                      {
                        icon: <Car size={14} color="#4A6FA5" />,
                        label: 'Vehicle',
                        value: myReservation.vehicle_number,
                      },
                    ].map((item, i) => (
                      <div
                        key={item.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '12px 16px',
                          borderBottom: i < 2 ? '1px solid #E4E7EC' : 'none',
                        }}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '7px',
                            background: '#EEF2FF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {item.icon}
                        </div>
                        <div>
                          <p style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            {item.label}
                          </p>
                          <p style={{ fontSize: '13px', fontWeight: '500', color: '#344054', fontFamily: item.label === 'Vehicle' ? 'monospace' : 'inherit', letterSpacing: item.label === 'Vehicle' ? '0.05em' : 'inherit' }}>
                            {item.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Warning text */}
                <AnimatePresence mode="wait">
                  {!isConfirming ? (
                    <motion.p
                      key="warning"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        fontSize: '13px',
                        color: '#667085',
                        background: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        marginBottom: '20px',
                        lineHeight: '1.5',
                      }}
                    >
                      ⚠️ Once cancelled, the slot will be available to other employees on a first-come basis.
                    </motion.p>
                  ) : (
                    <motion.p
                      key="confirm-text"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#9B2335',
                        textAlign: 'center',
                        marginBottom: '20px',
                      }}
                    >
                      Are you sure? This cannot be undone and your slot will be released.
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    id="keep-reservation-btn"
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
                    Keep Spot
                  </button>
                  <button
                    id="cancel-confirm-btn"
                    onClick={isConfirming ? handleCancel : () => setIsConfirming(true)}
                    disabled={isSubmitting}
                    style={{
                      flex: 1,
                      padding: '11px 20px',
                      borderRadius: '10px',
                      background: isConfirming ? '#9B2335' : '#FFF1F2',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: isConfirming ? 'white' : '#9B2335',
                      cursor: isSubmitting ? 'wait' : 'pointer',
                      transition: 'all 200ms ease',
                      border: `1px solid ${isConfirming ? '#9B2335' : '#FCA5A5'}`,
                    } as React.CSSProperties}
                    onMouseEnter={(e) => {
                      if (!isSubmitting && isConfirming) e.currentTarget.style.background = '#7F1D1D';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmitting && isConfirming) e.currentTarget.style.background = '#9B2335';
                    }}
                  >
                    {isSubmitting ? 'Releasing…' : isConfirming ? 'Yes, Release Slot' : 'Release Slot'}
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
