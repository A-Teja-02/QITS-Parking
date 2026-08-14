import { useSlotStatus } from '../hooks/useReservations';
import { useAppStore } from '../store/useAppStore';
import { useParkingStore } from '../store/useParkingStore';
import { useAuthStore } from '../store/useAuthStore';
import { ParkingSpace } from './ParkingSpace';

export function ParkingLot() {
  const statuses = useSlotStatus();
  const { selectedFloorId } = useParkingStore();
  const { user } = useAuthStore();
  const { 
    animatingSlot, 
    setSelectedSlot, 
    setShowReservationModal, 
    setShowCancellationModal,
    setShowManagerReleaseModal
  } = useAppStore();

  const handleAvailableClick = (slot: any) => {
    if ((user?.role === 'manager' || user?.role === 'hr') && slot.reserved_for_manager_id === user.id) {
      setSelectedSlot(slot);
      setShowManagerReleaseModal(true);
      return;
    }
    setSelectedSlot(slot);
    setShowReservationModal(true);
  };

  const handleMySpotClick = (slot: any) => {
    if ((user?.role === 'manager' || user?.role === 'hr') && slot.reserved_for_manager_id === user.id) {
      setSelectedSlot(slot);
      setShowManagerReleaseModal(true);
      return;
    }
    setSelectedSlot(slot);
    setShowCancellationModal(true);
  };
  
  const currentFloor = useParkingStore(state => state.floors.find(f => f.id === selectedFloorId));

  if (!selectedFloorId) return null;

  const floorSlots = statuses.filter(s => s.slot.floor_id === selectedFloorId);

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4E7EC',
        borderRadius: '24px',
        padding: '32px',
        boxShadow: '0 12px 24px -8px rgba(16, 24, 40, 0.05)',
        position: 'relative',
      }}
    >
      {currentFloor && currentFloor.is_active === false && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(2px)',
          borderRadius: '24px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ padding: '16px 24px', background: '#FEF2F2', border: '1px solid #F87171', borderRadius: '12px', color: '#991B1B', fontWeight: '600', fontSize: '18px', textAlign: 'center' }}>
            This floor is currently closed.
            <div style={{ fontSize: '14px', fontWeight: '400', marginTop: '4px' }}>HR has disabled bookings for this floor.</div>
          </div>
        </div>
      )}
      {/* Color Indicators Legend */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '32px',
          paddingBottom: '20px',
          borderBottom: '1px solid #F2F4F7',
        }}
      >
        {[
          { border: '2px solid #2D6A4F', bg: '#FAFFFE', label: 'Available' },
          { border: '2px solid #1E3A5F', bg: '#EEF4FF', label: 'My Booking' },
          { border: '2px solid #FCA5A5', bg: '#FFF5F5', label: 'Booked' },
          { border: '2px solid #FCD34D', bg: '#FFFBEB', label: 'Manager Reserved' },
          { border: '2px solid #7C3AED', bg: '#F5F3FF', label: 'HR Reserved' },
          { border: '2px solid #D1D5DB', bg: '#F9FAFB', label: 'Maintenance' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#475569',
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                background: item.bg,
                border: item.border,
              }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div
        className="parking-grid"
        style={{
          opacity: currentFloor?.is_active === false ? 0.4 : 1,
        }}
      >
        {floorSlots.map((status) => (
          <ParkingSpace
            key={status.slot.id}
            slotStatus={status}
            isAnimating={animatingSlot === status.slot.id}
            onAvailableClick={() => handleAvailableClick(status.slot)}
            onMySpotClick={() => handleMySpotClick(status.slot)}
          />
        ))}
      </div>
    </div>
  );
}
