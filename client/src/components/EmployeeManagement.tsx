import { useState } from 'react';
import { useAdminStore } from '../store/useAdminStore';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { UserPlus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

export function EmployeeManagement() {
  const { users, fetchUsers, isLoading } = useAdminStore();
  const { addToast } = useAppStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', role: 'employee' });
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.users.toggleStatus(userId, !currentStatus);
      await fetchUsers();
      addToast({ type: 'success', message: 'User status updated.' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to update user.' });
    }
  };

  const handleDeleteClick = (userId: string) => {
    setDeletingUserId(userId);
  };

  const confirmDelete = async () => {
    if (!deletingUserId) return;
    try {
      await api.users.delete(deletingUserId);
      await fetchUsers();
      addToast({ type: 'success', message: 'User deleted.' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to delete user.' });
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        name: '', // default empty, entered by user in profile later
        department: '', // default empty, filled by user themselves later
        avatar_initials: 'US' // default placeholder initials
      };
      await api.users.create(data);
      await fetchUsers();
      setShowAddForm(false);
      setFormData({ email: '', role: 'employee' });
      addToast({ type: 'success', message: 'User created successfully.' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to create user.' });
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.users.update(userId, { role: newRole });
      await fetchUsers();
      addToast({ type: 'success', message: 'User role updated successfully.' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to update user role.' });
    }
  };

  return (
    <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E4E7EC', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #E4E7EC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#101828' }}>Employee Directory</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '8px',
            background: '#1E3A5F', color: 'white', border: 'none',
            fontSize: '14px', fontWeight: '500', cursor: 'pointer'
          }}
        >
          <UserPlus size={16} />
          {showAddForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {showAddForm && (
        <div style={{ padding: '24px', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC' }}>
          <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', maxWidth: '800px' }}>
            <input required type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }} />

            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="hr">HR / Admin</option>
            </select>
            <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', background: '#2D6A4F', color: 'white', border: 'none', fontWeight: '500', cursor: 'pointer' }}>Save User</button>
          </form>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#F9FAFB' }}>
            <tr>
              <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '500', color: '#667085', textTransform: 'uppercase' }}>Name</th>
              <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '500', color: '#667085', textTransform: 'uppercase' }}>Role</th>

              <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '500', color: '#667085', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '500', color: '#667085', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {u.profile_picture_url ? (
                      <img
                        src={u.profile_picture_url}
                        alt={u.name}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1E3A5F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600' }}>
                        {u.avatar_initials}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#101828' }}>{u.name}</div>
                      <div style={{ fontSize: '13px', color: '#667085' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #D0D5DD',
                      background: '#FFFFFF',
                      fontSize: '14px',
                      color: '#344054',
                      fontWeight: '500',
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
                    }}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR / Admin</option>
                  </select>
                </td>

                <td style={{ padding: '16px 24px' }}>
                  <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', background: u.is_active ? '#F0FDF4' : '#FEF2F2', color: u.is_active ? '#065F46' : '#991B1B' }}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={() => handleToggleStatus(u.id, u.is_active)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667085' }} title="Toggle Status">
                      {u.is_active ? <ToggleRight size={20} color="#059669" /> : <ToggleLeft size={20} />}
                    </button>
                    <button onClick={() => handleDeleteClick(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }} title="Delete User">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deletingUserId && (
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
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#101828', marginBottom: '8px', marginTop: 0 }}>Delete User</h3>
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '24px', lineHeight: 1.5 }}>
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setDeletingUserId(null)}
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
                onClick={confirmDelete}
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
