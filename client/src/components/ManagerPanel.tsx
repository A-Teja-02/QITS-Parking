import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, CheckCircle, Clock, X, Calendar } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useParkingStore } from '../store/useParkingStore';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { formatDateDMY } from '../utils/date';

export function ManagerPanel() {
  const { user } = useAuthStore();
  const { slots, managerReleases, tomorrowDate, fetchManagerReleases } = useParkingStore();
  const { addToast } = useAppStore();
  const [isReleasing, setIsReleasing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [releaseType, setReleaseType] = useState<'single' | 'range'>('single');
  const [singleDate, setSingleDate] = useState(tomorrowDate || '');
  const [startDate, setStartDate] = useState(tomorrowDate || '');
  const [endDate, setEndDate] = useState(tomorrowDate || '');

  // Reclaim Modal States
  const [showReclaimModal, setShowReclaimModal] = useState(false);
  const [reclaimType, setReclaimType] = useState<'single' | 'range'>('single');
  const [reclaimSingleDate, setReclaimSingleDate] = useState(tomorrowDate || '');
  const [reclaimStartDate, setReclaimStartDate] = useState(tomorrowDate || '');
  const [reclaimEndDate, setReclaimEndDate] = useState(tomorrowDate || '');
  const [isReclaiming, setIsReclaiming] = useState(false);

  // Find manager's reserved slot across all floors
  const mySlot = slots.find(s => s.reserved_for_manager_id === user?.id);
  const release = managerReleases.find(r => r.slot_id === mySlot?.id && r.release_date === tomorrowDate);

  if (!mySlot) return null;

  const isWeekendDay = (dateStr: string) => {
    if (!dateStr) return false;
    const dateObj = new Date(dateStr + 'T00:00:00');
    const day = dateObj.getDay();
    return day === 6 || day === 0; // 6 = Saturday, 0 = Sunday
  };

  const handleDateChange = (val: string, setter: (v: string) => void) => {
    if (val && isWeekendDay(val)) {
      addToast({ type: 'error', message: 'Saturdays and Sundays cannot be selected.' });
      setter('');
    } else {
      setter(val);
    }
  };

  const handleRelease = async () => {
    setIsReleasing(true);
    try {
      if (releaseType === 'single') {
        if (!singleDate) {
          addToast({ type: 'error', message: 'Please select a date.' });
          return;
        }
        await api.slots.release(mySlot.id, { date: singleDate });
        addToast({ type: 'success', message: `You released slot for ${formatDateDMY(singleDate)}` });
      } else {
        if (!startDate || !endDate) {
          addToast({ type: 'error', message: 'Please select start and end dates.' });
          return;
        }
        if (new Date(startDate) > new Date(endDate)) {
          addToast({ type: 'error', message: 'Start date must be before or equal to end date.' });
          return;
        }
        await api.slots.release(mySlot.id, { start_date: startDate, end_date: endDate });
        addToast({ type: 'success', message: `You released slot from ${formatDateDMY(startDate)} to ${formatDateDMY(endDate)}` });
      }
      
      if (tomorrowDate) {
        await fetchManagerReleases(tomorrowDate);
      }
      setShowModal(false);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to release slot.' });
    } finally {
      setIsReleasing(false);
    }
  };

  const handleReclaim = async () => {
    setIsReclaiming(true);
    try {
      if (reclaimType === 'single') {
        if (!reclaimSingleDate) {
          addToast({ type: 'error', message: 'Please select a date.' });
          return;
        }
        await api.slots.cancelRelease(mySlot.id, { date: reclaimSingleDate });
        addToast({ type: 'success', message: `You reclaimed slot for ${formatDateDMY(reclaimSingleDate)}` });
      } else {
        if (!reclaimStartDate || !reclaimEndDate) {
          addToast({ type: 'error', message: 'Please select start and end dates.' });
          return;
        }
        if (new Date(reclaimStartDate) > new Date(reclaimEndDate)) {
          addToast({ type: 'error', message: 'Start date must be before or equal to end date.' });
          return;
        }
        await api.slots.cancelRelease(mySlot.id, { start_date: reclaimStartDate, end_date: reclaimEndDate });
        addToast({ type: 'success', message: `You reclaimed slot from ${formatDateDMY(reclaimStartDate)} to ${formatDateDMY(reclaimEndDate)}` });
      }
      
      if (tomorrowDate) {
        await fetchManagerReleases(tomorrowDate);
      }
      setShowReclaimModal(false);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to reclaim slot.' });
    } finally {
      setIsReclaiming(false);
    }
  };

  const handleCancelRelease = async () => {
    if (!tomorrowDate) return;
    setIsReleasing(true);
    try {
      await api.slots.cancelRelease(mySlot.id, { date: tomorrowDate });
      await fetchManagerReleases(tomorrowDate);
      addToast({ type: 'success', message: 'Slot reserved back successfully.' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to keep slot.' });
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4E7EC',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <KeyRound size={20} color="#F59E0B" />
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#101828' }}>
              Your Reserved Slot: {mySlot.label}
            </h2>
          </div>
          <p style={{ fontSize: '14px', color: '#667085', maxWidth: '600px' }}>
            This slot is permanently assigned to you. If you are coming to the office, no action is required. If you are not coming (WFH / Leave), please release your slot for those dates.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {release ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #DCFCE7' }}>
                <CheckCircle size={16} color="#059669" />
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#065F46' }}>Released for tomorrow</span>
              </div>
              <button
                onClick={handleCancelRelease}
                disabled={isReleasing}
                style={{
                  padding: '8px 12px',
                  background: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  cursor: isReleasing ? 'wait' : 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
              >
                Keep Slot
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#EFF6FF', borderRadius: '8px', border: '1px solid #DBEAFE' }}>
              <Clock size={16} color="#1E40AF" />
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#1E40AF' }}>Kept for tomorrow</span>
            </div>
          )}

          <button
            onClick={() => {
              setReclaimSingleDate(tomorrowDate || '');
              setReclaimStartDate(tomorrowDate || '');
              setReclaimEndDate(tomorrowDate || '');
              setShowReclaimModal(true);
            }}
            style={{
              padding: '10px 16px',
              background: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
          >
            Reclaim Parking
          </button>

          <button
            onClick={() => {
              setSingleDate(tomorrowDate || '');
              setStartDate(tomorrowDate || '');
              setEndDate(tomorrowDate || '');
              setShowModal(true);
            }}
            style={{
              padding: '10px 16px',
              background: '#1E3A5F',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#172D4B')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#1E3A5F')}
          >
            Release Parking
          </button>
        </div>
      </div>

      {/* Release Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
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
                <div style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #2D5491 100%)', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#FFFFFF' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Release Parking Slot</h3>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '4px 0 0 0' }}>Release slot {mySlot.label} for others</p>
                  </div>
                  <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', cursor: 'pointer' }}>
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
                        onChange={e => handleDateChange(e.target.value, setSingleDate)}
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
                          onChange={e => handleDateChange(e.target.value, setStartDate)}
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
                          onChange={e => handleDateChange(e.target.value, setEndDate)}
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
                      onClick={() => setShowModal(false)}
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
                  </div>
                </div>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Reclaim Modal */}
      <AnimatePresence>
        {showReclaimModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReclaimModal(false)}
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
                <div style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#FFFFFF' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Reclaim Parking Slot</h3>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '4px 0 0 0' }}>Reclaim slot {mySlot.label} back for yourself</p>
                  </div>
                  <button onClick={() => setShowReclaimModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px' }}>
                  {/* Select Reclaim Type */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <button
                      type="button"
                      onClick={() => setReclaimType('single')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: reclaimType === 'single' ? '#059669' : '#E4E7EC',
                        background: reclaimType === 'single' ? '#ECFDF5' : '#FFFFFF',
                        color: reclaimType === 'single' ? '#065F46' : '#475569',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Single Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setReclaimType('range')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: reclaimType === 'range' ? '#059669' : '#E4E7EC',
                        background: reclaimType === 'range' ? '#ECFDF5' : '#FFFFFF',
                        color: reclaimType === 'range' ? '#065F46' : '#475569',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Date Range
                    </button>
                  </div>

                  {reclaimType === 'single' ? (
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#344054', marginBottom: '8px' }}>Select Date</label>
                      <input
                        type="date"
                        value={reclaimSingleDate}
                        onChange={e => handleDateChange(e.target.value, setReclaimSingleDate)}
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
                          value={reclaimStartDate}
                          onChange={e => handleDateChange(e.target.value, setReclaimStartDate)}
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
                          value={reclaimEndDate}
                          onChange={e => handleDateChange(e.target.value, setReclaimEndDate)}
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
                      onClick={() => setShowReclaimModal(false)}
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
                    <button
                      type="button"
                      onClick={handleReclaim}
                      disabled={isReclaiming}
                      style={{
                        flex: 2,
                        padding: '11px 20px',
                        borderRadius: '10px',
                        border: 'none',
                        background: isReclaiming ? '#34D399' : '#10B981',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#FFFFFF',
                        cursor: isReclaiming ? 'wait' : 'pointer'
                      }}
                    >
                      {isReclaiming ? 'Reclaiming…' : 'Confirm Reclaim'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
