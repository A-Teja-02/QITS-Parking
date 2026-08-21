import { useState } from 'react';
import { useParkingStore } from '../store/useParkingStore';
import { useAdminStore } from '../store/useAdminStore';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { Edit2, ShieldAlert, Trash2, Plus } from 'lucide-react';
import type { ParkingSlot } from '../types';
import { getSpecialDesignation } from './ParkingSpace';

export function ParkingManagement() {
  const { floors, slots, selectedFloorId, setSelectedFloorId, fetchSlots } = useParkingStore();
  const { users } = useAdminStore();
  const { addToast } = useAppStore();
  
  const [editingSlot, setEditingSlot] = useState<ParkingSlot | null>(null);
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState('');
  const [managerId, setManagerId] = useState('');
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newSlot, setNewSlot] = useState({
    label: '',
    status: 'active',
    reserved_for_manager_id: ''
  });

  const floorSlots = slots.filter(s => s.floor_id === selectedFloorId);
  const managers = users.filter(u => u.role === 'manager' || u.role === 'hr');

  const handleEdit = (slot: ParkingSlot) => {
    setEditingSlot(slot);
    setLabel(slot.label);
    setStatus(slot.status);
    setManagerId(slot.reserved_for_manager_id || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    try {
      if (label.trim() !== editingSlot.label) {
        await api.slots.update(editingSlot.id, { label: label.trim() });
      }

      if (status !== editingSlot.status) {
        await api.slots.setStatus(editingSlot.id, status);
      }
      
      if (managerId !== (editingSlot.reserved_for_manager_id || '')) {
        if (managerId) {
          await api.slots.assignManager(editingSlot.id, managerId);
        } else {
          await api.slots.removeManager(editingSlot.id);
        }
      }

      await fetchSlots();
      setEditingSlot(null);
      addToast({ type: 'success', message: 'Slot updated successfully.' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to update slot.' });
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlot.label) return;
    try {
      const payload = {
        id: newSlot.label,
        label: newSlot.label,
        floor_id: selectedFloorId,
        position: floorSlots.length + 1,
        status: newSlot.status,
        reserved_for_manager_id: newSlot.reserved_for_manager_id || null
      };
      await api.slots.create(payload);
      await fetchSlots();
      setIsAdding(false);
      setNewSlot({ label: '', status: 'active', reserved_for_manager_id: '' });
      addToast({ type: 'success', message: 'Slot created successfully.' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to create slot.' });
    }
  };

  const handleDeleteSlotClick = (slotId: string) => {
    setDeletingSlotId(slotId);
  };

  const confirmDeleteSlot = async () => {
    if (!deletingSlotId) return;
    try {
      await api.slots.delete(deletingSlotId);
      await fetchSlots();
      addToast({ type: 'success', message: 'Slot deleted successfully.' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to delete slot.' });
    } finally {
      setDeletingSlotId(null);
    }
  };

  return (
    <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E4E7EC', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #E4E7EC' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#101828' }}>Parking Lots Configuration</h2>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Floor selection */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {floors.map(floor => (
            <div key={floor.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', border: '1px solid', borderColor: selectedFloorId === floor.id ? '#1E3A5F' : '#E4E7EC', borderRadius: '12px', background: selectedFloorId === floor.id ? '#EEF2FF' : '#FFFFFF' }}>
              <button
                onClick={() => setSelectedFloorId(floor.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: selectedFloorId === floor.id ? '#1E3A5F' : '#667085',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {floor.label}
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
                <span style={{ fontSize: '12px', color: (floor.is_active ?? true) ? '#059669' : '#DC2626', fontWeight: '500' }}>
                  {(floor.is_active ?? true) ? 'Open' : 'Closed'}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const nextActive = !(floor.is_active ?? true);
                    try {
                      await useParkingStore.getState().toggleFloorStatus(floor.id, nextActive);
                      addToast({ type: 'success', message: `Floor ${floor.label} ${nextActive ? 'enabled' : 'disabled'}` });
                    } catch (err) {
                      addToast({ type: 'error', message: 'Failed to update floor status' });
                    }
                  }}
                  style={{
                    position: 'relative',
                    width: '36px',
                    height: '20px',
                    borderRadius: '10px',
                    background: (floor.is_active ?? true) ? '#059669' : '#D1D5DB',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: (floor.is_active ?? true) ? '18px' : '2px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'left 0.2s'
                    }}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Slots Header and Add Slot Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#344054' }}>Slots ({floorSlots.length})</h3>
          <button
            onClick={() => setIsAdding(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#1E3A5F',
              color: '#FFFFFF',
              fontWeight: '500',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'background-color 0.2s'
            }}
          >
            <Plus size={16} /> Add Slot
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
          {floorSlots.map(slot => (
            <div key={slot.id} style={{ padding: '16px', border: '1px solid #E4E7EC', borderRadius: '12px', background: '#F9FAFB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#101828' }}>{slot.label}</div>
                  <div style={{ fontSize: '12px', color: '#667085', marginTop: '4px', textTransform: 'capitalize' }}>Status: {slot.status}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleEdit(slot)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A6FA5', padding: '4px' }} title="Edit Slot">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDeleteSlotClick(slot.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D32F2F', padding: '4px' }} title="Delete Slot">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {slot.reserved_for_manager_id && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#92400E', background: '#FEF3C7', padding: '6px 8px', borderRadius: '6px' }}>
                  <ShieldAlert size={14} />
                  Manager Reserved
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {editingSlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#FFF', padding: '32px', borderRadius: '16px', width: '400px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>Edit Slot {editingSlot.label}</h3>
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Slot Name / Label</label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={e => setLabel(e.target.value.toUpperCase().trim())}
                  placeholder="e.g. 106A"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB' }}>
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Assign Manager</label>
                <select value={managerId} onChange={e => setManagerId(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB' }}>
                  <option value="">None</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{getSpecialDesignation(m.name) || m.name || m.email}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditingSlot(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', background: '#FFF', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1E3A5F', color: '#FFF', cursor: 'pointer' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdding && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#FFF', padding: '32px', borderRadius: '16px', width: '400px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>Add New Slot</h3>
            <form onSubmit={handleCreateSlot}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Slot Label / ID (e.g. P109)</label>
                <input
                  type="text"
                  required
                  value={newSlot.label}
                  onChange={e => setNewSlot({ ...newSlot, label: e.target.value.toUpperCase().trim() })}
                  placeholder="e.g. P109"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', boxSizing: 'border-box' }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Status</label>
                <select value={newSlot.status} onChange={e => setNewSlot({ ...newSlot, status: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB' }}>
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Assign Manager (Optional)</label>
                <select value={newSlot.reserved_for_manager_id} onChange={e => setNewSlot({ ...newSlot, reserved_for_manager_id: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB' }}>
                  <option value="">None</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{getSpecialDesignation(m.name) || m.name || m.email}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsAdding(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', background: '#FFF', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1E3A5F', color: '#FFF', cursor: 'pointer' }}>Add Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deletingSlotId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(16, 24, 40, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 20px 24px -4px rgba(16, 24, 40, 0.1), 0 8px 8px -4px rgba(16, 24, 40, 0.04)',
            textAlign: 'center',
            margin: '0 16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#FEE4E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: '#D92D20'
            }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#101828', marginBottom: '8px', marginTop: 0 }}>Delete Parking Slot</h3>
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '24px', lineHeight: 1.5 }}>
              Are you sure you want to delete slot <strong>{deletingSlotId}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setDeletingSlotId(null)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid #D0D5DD',
                  background: '#FFFFFF',
                  color: '#344054',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSlot}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#D92D20',
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
