import axios from 'axios';

const actions = axios.create({
  baseURL: process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888',
});

export const register = async (userData: any) => {
  const response = await actions.post('/auth/register', userData);
  return response.data;
};

export default actions;
