import { useState, useEffect } from 'react';
import { useAdminStore } from '../store/useAdminStore';
import { useAppStore } from '../store/useAppStore';
import { Search, Calendar, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDisplayDate, formatDateDMY } from '../utils/date';
import { api } from '../services/api';

export function ReservationManagement() {
  const { allReservations, users, fetchAllReservations } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [slotMap, setSlotMap] = useState<Record<string, string>>({});

  useEffect(() => {
    api.slots.list().then(slotsData => {
      const mapping: Record<string, string> = {};
      slotsData.forEach(slot => {
        const floorName = slot.floor_id.replace('floor-', '').toUpperCase();
        const slotLabel = slot.label.includes('-') ? slot.label : `${slot.label}-${slot.position}`;
        mapping[slot.id] = `${floorName} - ${slotLabel}`;
      });
      setSlotMap(mapping);
    }).catch(err => console.error(err));
  }, []);

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [dateFilter, setDateFilter] = useState(getTodayDateString());

  useEffect(() => {
    // Initial fetch on mount or date change (shows loading spinner if applicable)
    fetchAllReservations(dateFilter || undefined, false);

    // Setup background polling every 3 seconds (silent update)
    const interval = setInterval(() => {
      fetchAllReservations(dateFilter || undefined, true);
    }, 3000);

    return () => clearInterval(interval);
  }, [dateFilter, fetchAllReservations]);

  const employeeIds = new Set(users.filter(u => u.role === 'employee').map(u => u.id));
  
  // Filter for employee reservations only
  const filteredReservations = allReservations
    .filter(r => employeeIds.has(r.user_id) && r.status === 'active')
    .filter(r => {
      const matchSearch = 
        r.user_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.slot_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchDate = !dateFilter || r.date === dateFilter;
      return matchSearch && matchDate;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handlePrevDate = () => {
    if (!dateFilter) return;
    const d = new Date(dateFilter);
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDateFilter(`${year}-${month}-${day}`);
  };

  const handleNextDate = () => {
    if (!dateFilter) return;
    const d = new Date(dateFilter);
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDateFilter(`${year}-${month}-${day}`);
  };

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E4E7EC', borderRadius: '16px', boxShadow: '0 4px 12px rgba(16, 24, 40, 0.04)', overflow: 'hidden' }}>
      {/* Header and Controls */}
      <div style={{ padding: '24px', borderBottom: '1px solid #E4E7EC', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#101828', margin: 0 }}>Employee Reservations</h3>
          <p style={{ fontSize: '13px', color: '#667085', margin: '4px 0 0 0' }}>View active parking bookings for employees.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%', maxWidth: '600px', marginTop: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={16} color="#667085" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search employee, slot, or vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #D0D5DD',
                fontSize: '14px',
                color: '#344054',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Date Selector with arrows */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={handlePrevDate}
                disabled={!dateFilter}
                style={{
                  background: 'none',
                  border: '1px solid #D0D5DD',
                  borderRadius: '8px',
                  padding: '9px',
                  cursor: dateFilter ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#344054',
                  opacity: dateFilter ? 1 : 0.5,
                  transition: 'background 150ms'
                }}
                onMouseEnter={(e) => { if (dateFilter) e.currentTarget.style.background = '#F9FAFB'; }}
                onMouseLeave={(e) => { if (dateFilter) e.currentTarget.style.background = 'none'; }}
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>

              <div style={{ position: 'relative', width: '160px' }}>
                <Calendar size={16} color="#667085" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: '8px',
                    border: '1px solid #D0D5DD',
                    fontSize: '14px',
                    color: '#344054',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleNextDate}
                disabled={!dateFilter}
                style={{
                  background: 'none',
                  border: '1px solid #D0D5DD',
                  borderRadius: '8px',
                  padding: '9px',
                  cursor: dateFilter ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#344054',
                  opacity: dateFilter ? 1 : 0.5,
                  transition: 'background 150ms'
                }}
                onMouseEnter={(e) => { if (dateFilter) e.currentTarget.style.background = '#F9FAFB'; }}
                onMouseLeave={(e) => { if (dateFilter) e.currentTarget.style.background = 'none'; }}
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            {dateFilter && (
              <div style={{ fontSize: '11px', color: '#475569', fontWeight: '600', marginRight: '4px' }}>
                Filter Date: {formatDateDMY(dateFilter)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E4E7EC' }}>
              <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Employee</th>
              <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Parking Slot</th>
              <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Vehicle Number</th>
              <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Reservation Date</th>
              <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Reserved By</th>
            </tr>
          </thead>
          <tbody>
            {filteredReservations.length > 0 ? (
              filteredReservations.map((res) => {
                const user = users.find(u => u.id === res.user_id);
                return (
                  <tr key={res.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 150ms' }} onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {user?.profile_picture_url ? (
                          <img
                            src={user.profile_picture_url}
                            alt={res.user_name}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#EEF2FF', color: '#1E3A5F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '12px' }}>
                            <span style={{ margin: 'auto' }}>{user?.avatar_initials || res.user_name.substring(0, 2).toUpperCase()}</span>
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>{res.user_name}</div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{user?.email || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', borderRadius: '12px', fontSize: '13px', fontWeight: '600' }}>
                        {slotMap[res.slot_id] || res.slot_id}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155', fontWeight: '500' }}>
                      {res.vehicle_number}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>
                      {formatDisplayDate(res.date)}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '13px', color: '#64748B' }}>
                      {res.reserved_by === 'hr' ? (
                        <span style={{ color: '#1E3A5F', fontWeight: '500' }}>HR Admin</span>
                      ) : (
                        <span>Self Service</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: '40px 24px', textAlign: 'center', color: '#64748B' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={32} color="#94A3B8" />
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>No employee reservations found.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
