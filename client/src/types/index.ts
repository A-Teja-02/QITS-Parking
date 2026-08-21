export type UserRole = 'employee' | 'manager' | 'hr';
export type SlotState = 'available' | 'reserved_employee' | 'reserved_manager' | 'released_manager' | 'occupied' | 'maintenance' | 'unavailable' | 'mine';

export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  vehicle_number: string;
  mobile_number: string;
  avatar_initials: string;
  role: UserRole;
  is_active: boolean;
  profile_picture_url?: string;
}

export interface Floor {
  id: string;
  name: string;
  label: string;
  order: number;
  is_active: boolean;
}

export interface ParkingSlot {
  id: string;
  label: string;
  floor_id: string;
  position: number;
  status: string;
  reserved_for_manager_id?: string | null;
  reserved_for_manager_name?: string | null;
  reserved_for_manager_role?: string | null;
}

export interface Reservation {
  id: string;
  user_id: string;
  user_name: string;
  slot_id: string;
  vehicle_number: string;
  date: string;  // ISO: YYYY-MM-DD
  created_at: string;
  reserved_by: string;
  status: string;
}

export interface ReservationCreate {
  user_id: string;
  user_name: string;
  slot_id: string;
  vehicle_number: string;
  date: string;
  reserved_by?: string;
}

export interface ManagerRelease {
  manager_id: string;
  slot_id: string;
  release_date: string;
}

export interface SlotStatus {
  slot: ParkingSlot;
  state: SlotState;
  reservation?: Reservation;
  manager_id?: string;
  manager_name?: string;
  manager_role?: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
