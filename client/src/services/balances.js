import { supabase } from '@/lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };
}

export const getUserBalanceSummary = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/users/balances/summary`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Failed to fetch balance summary');
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: { message: error.message } };
  }
};

export const getGroupBalances = async (groupId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/groups/${groupId}/balances`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Failed to fetch group balances');
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: { message: error.message } };
  }
};
