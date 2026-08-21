import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useParkingStore } from '../store/useParkingStore';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';

export function ManagerReleaseModal() {
  const { user } = useAuthStore();
  const { tomorrowDate, selectedDate, fetchManagerReleases, managerReleases } = useParkingStore();
  const { 
    showManagerReleaseModal, 
    setShowManagerReleaseModal, 
    selectedSlot, 
    addToast 
  } = useAppStore();

  const [isReleasing, setIsReleasing] = useState(false);
  const [releaseType, setReleaseType] = useState<'single' | 'range'>('single');
  
  const initialDate = selectedDate || tomorrowDate || '';
  const [singleDate, setSingleDate] = useState(initialDate);
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);

  // Update dates when selectedDate or tomorrowDate changes
  useEffect(() => {
    const activeDate = selectedDate || tomorrowDate || '';
    if (activeDate) {
      setSingleDate(activeDate);
      setStartDate(activeDate);
      setEndDate(activeDate);
    }
  }, [selectedDate, tomorrowDate]);

  if (!user || !selectedSlot) return null;

  const isCurrentlyReleased = releaseType === 'single' && managerReleases.some(
    r => r.slot_id === selectedSlot.id && r.release_date === singleDate
  );

  const handleRelease = async () => {
    setIsReleasing(true);
    try {
      if (releaseType === 'single') {
        if (!singleDate) {
          addToast({ type: 'error', message: 'Please select a date.' });
          return;
        }
        await api.slots.release(selectedSlot.id, { date: singleDate });
      } else {
        if (!startDate || !endDate) {
          addToast({ type: 'error', message: 'Please select start and end dates.' });
          return;
        }
        if (new Date(startDate) > new Date(endDate)) {
          addToast({ type: 'error', message: 'Start date must be before or equal to end date.' });
          return;
        }
        await api.slots.release(selectedSlot.id, { start_date: startDate, end_date: endDate });
      }
      
      // Refresh status
      await useParkingStore.getState().fetchSlots();
      if (selectedDate) {
        await useParkingStore.getState().fetchReservations(selectedDate);
        await fetchManagerReleases(selectedDate);
      }
      if (tomorrowDate && tomorrowDate !== selectedDate) {
        await fetchManagerReleases(tomorrowDate);
      }
      
      addToast({ type: 'success', message: 'Slot released successfully.' });
      setShowManagerReleaseModal(false);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to release slot.' });
    } finally {
      setIsReleasing(false);
    }
  };

  const handleReclaim = async () => {
    setIsReleasing(true);
    try {
      await api.slots.cancelRelease(selectedSlot.id, singleDate);
      
      // Refresh status
      await useParkingStore.getState().fetchSlots();
      if (selectedDate) {
        await useParkingStore.getState().fetchReservations(selectedDate);
        await fetchManagerReleases(selectedDate);
      }
      if (tomorrowDate && tomorrowDate !== selectedDate) {
        await fetchManagerReleases(tomorrowDate);
      }
      
      addToast({ type: 'success', message: 'Slot reclaimed successfully.' });
      setShowManagerReleaseModal(false);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to reclaim slot.' });
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <AnimatePresence>
      {showManagerReleaseModal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowManagerReleaseModal(false)}
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
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              style={{
                width: '100%',
                maxWidth: '440px',
                pointerEvents: 'auto',
              }}
            >
            <div style={{ background: '#FFFFFF', borderRadius: '20px', boxShadow: '0 24px 48px -12px rgba(16,24,40,0.25)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ background: isCurrentlyReleased ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'linear-gradient(135deg, #1E3A5F 0%, #2D5491 100%)', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#FFFFFF' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                    {isCurrentlyReleased ? 'Reclaim Parking Slot' : 'Release Parking Slot'}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '4px 0 0 0' }}>
                    {isCurrentlyReleased ? `Reclaim slot ${selectedSlot.floor_id.replace('floor-', '').toUpperCase()} - ${selectedSlot.label}` : `Release slot ${selectedSlot.floor_id.replace('floor-', '').toUpperCase()} - ${selectedSlot.label} for others`}
                  </p>
                </div>
                <button onClick={() => setShowManagerReleaseModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '24px' }}>
                {/* Select Release Type */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setReleaseType('single')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: releaseType === 'single' ? '#1E3A5F' : '#E4E7EC',
                      background: releaseType === 'single' ? '#EEF2FF' : '#FFFFFF',
                      color: releaseType === 'single' ? '#1E3A5F' : '#475569',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Single Date
                  </button>
                  <button
                    type="button"
                    onClick={() => setReleaseType('range')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: releaseType === 'range' ? '#1E3A5F' : '#E4E7EC',
                      background: releaseType === 'range' ? '#EEF2FF' : '#FFFFFF',
                      color: releaseType === 'range' ? '#1E3A5F' : '#475569',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Date Range
                  </button>
                </div>

                {releaseType === 'single' ? (
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#344054', marginBottom: '8px' }}>Select Date</label>
                    <input
                      type="date"
                      value={singleDate}
                      onChange={e => setSingleDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #D1D5DB',
                        fontSize: '14px',
                        color: '#101828',
                        background: '#FFFFFF',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#344054', marginBottom: '8px' }}>From Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid #D1D5DB',
                          fontSize: '14px',
                          color: '#101828',
                          background: '#FFFFFF',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#344054', marginBottom: '8px' }}>To Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid #D1D5DB',
                          fontSize: '14px',
                          color: '#101828',
                          background: '#FFFFFF',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowManagerReleaseModal(false)}
                    style={{
                      flex: 1,
                      padding: '11px 20px',
                      borderRadius: '10px',
                      border: '1px solid #E4E7EC',
                      background: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#344054',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  {isCurrentlyReleased ? (
                    <button
                      type="button"
                      onClick={handleReclaim}
                      disabled={isReleasing}
                      style={{
                        flex: 2,
                        padding: '11px 20px',
                        borderRadius: '10px',
                        border: 'none',
                        background: isReleasing ? '#A7F3D0' : '#10B981',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#FFFFFF',
                        cursor: isReleasing ? 'wait' : 'pointer'
                      }}
                    >
                      {isReleasing ? 'Reclaiming…' : 'Confirm Reclaim'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRelease}
                      disabled={isReleasing}
                      style={{
                        flex: 2,
                        padding: '11px 20px',
                        borderRadius: '10px',
                        border: 'none',
                        background: isReleasing ? '#4A6FA5' : '#1E3A5F',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#FFFFFF',
                        cursor: isReleasing ? 'wait' : 'pointer'
                      }}
                    >
                      {isReleasing ? 'Releasing…' : 'Confirm Release'}
                    </button>
                  )}
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
