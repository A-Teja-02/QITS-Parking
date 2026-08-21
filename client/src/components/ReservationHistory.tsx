import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { History, Calendar, Car } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/api';
import type { Reservation, ParkingSlot } from '../types';
import { formatDisplayDate } from '../utils/date';

export function ReservationHistory() {
  const { user } = useAuthStore();
  const [history, setHistory] = useState<Reservation[]>([]);
  const [slotMap, setSlotMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      Promise.all([
        api.reservations.history(user.id),
        api.slots.list()
      ])
        .then(([historyData, slotsData]) => {
          // Sort descending by date
          historyData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setHistory(historyData);

          const mapping: Record<string, string> = {};
          slotsData.forEach(slot => {
            const floorName = slot.floor_id.replace('floor-', '').toUpperCase();
            mapping[slot.id] = `${floorName} - ${slot.label}`;
          });
          setSlotMap(mapping);
        })
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (loading) return null;
  if (history.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        marginTop: '32px',
        background: '#FFFFFF',
        border: '1px solid #E4E7EC',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <History size={20} color="#4A6FA5" />
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#101828' }}>
          Reservation History
        </h2>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E4E7EC' }}>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '500', color: '#667085', textTransform: 'uppercase' }}>Date</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '500', color: '#667085', textTransform: 'uppercase' }}>Slot</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '500', color: '#667085', textTransform: 'uppercase' }}>Vehicle</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '500', color: '#667085', textTransform: 'uppercase' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map(res => (
              <tr key={res.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '16px', fontSize: '14px', color: '#101828' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="#9CA3AF" />
                    {formatDisplayDate(res.date)}
                  </div>
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#101828', fontWeight: '500' }}>
                  {slotMap[res.slot_id] || res.slot_id}
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#667085', fontFamily: 'monospace' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Car size={14} color="#9CA3AF" />
                    {res.vehicle_number}
                  </div>
                </td>
                <td style={{ padding: '16px', fontSize: '14px' }}>
                  {res.status === 'active' ? (
                    <span style={{ padding: '4px 8px', borderRadius: '12px', background: '#F0FDF4', color: '#065F46', fontSize: '12px', fontWeight: '500' }}>Active</span>
                  ) : (
                    <span style={{ padding: '4px 8px', borderRadius: '12px', background: '#F3F4F6', color: '#374151', fontSize: '12px', fontWeight: '500' }}>Cancelled</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
