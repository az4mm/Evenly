import { supabase } from '@/lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper: get auth headers from current session
async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };
}

export async function createGroup({ name, currency }) {
  const res = await fetch(`${API_URL}/api/groups`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ name, currency }),
  });
  return res.json();
}

export async function getGroups() {
  const res = await fetch(`${API_URL}/api/groups`, {
    headers: await authHeaders(),
  });
  return res.json();
}

export async function getGroup(id) {
  const res = await fetch(`${API_URL}/api/groups/${id}`, {
    headers: await authHeaders(),
  });
  return res.json();
}

export async function updateGroup(id, updates) {
  const res = await fetch(`${API_URL}/api/groups/${id}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function deleteGroup(id) {
  const res = await fetch(`${API_URL}/api/groups/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  return res.json();
}

export async function getMembers(groupId) {
  const res = await fetch(`${API_URL}/api/groups/${groupId}/members`, {
    headers: await authHeaders(),
  });
  return res.json();
}

export async function previewGroup(code) {
  const res = await fetch(`${API_URL}/api/groups/preview/${code}`, {
    headers: await authHeaders(),
  });
  return res.json();
}

export async function joinGroup(inviteCode) {
  const res = await fetch(`${API_URL}/api/groups/join`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ invite_code: inviteCode }),
  });
  return res.json();
}

export async function removeMember(groupId, userId) {
  const res = await fetch(`${API_URL}/api/groups/${groupId}/members/${userId}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  return res.json();
}

export async function updateMemberRole(groupId, userId, role) {
  const res = await fetch(`${API_URL}/api/groups/${groupId}/members/${userId}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify({ role }),
  });
  return res.json();
}
