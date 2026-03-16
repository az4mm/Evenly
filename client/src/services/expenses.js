import { supabase } from '@/lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };
}

export async function getExpenses(groupId) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/groups/${groupId}/expenses`, { headers });
    return await res.json();
  } catch {
    return { success: false, error: { message: 'Network error' } };
  }
}

export async function addExpense(groupId, expenseData) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/groups/${groupId}/expenses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(expenseData),
    });
    return await res.json();
  } catch {
    return { success: false, error: { message: 'Network error' } };
  }
}

export async function updateExpense(groupId, expenseId, expenseData) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/groups/${groupId}/expenses/${expenseId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(expenseData),
    });
    return await res.json();
  } catch {
    return { success: false, error: { message: 'Network error' } };
  }
}

export async function deleteExpense(groupId, expenseId) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/groups/${groupId}/expenses/${expenseId}`, {
      method: 'DELETE',
      headers,
    });
    return await res.json();
  } catch {
    return { success: false, error: { message: 'Network error' } };
  }
}
