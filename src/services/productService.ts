import { api } from './api';
import { Product } from '../types/product';

export const productService = {
  getAll: async (isActive?: boolean) => {
    const params = isActive !== undefined ? { isActive } : {};
    const response = await api.get<Product[]>('/product', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<Product>(`/product/${id}`);
    return response.data;
  },

  create: async (product: Omit<Product, 'id'>) => {
    const response = await api.post<Product>('/product', product);
    return response.data;
  },

  update: async (id: string, product: Partial<Product>) => {
    const response = await api.put<Product>(`/product/${id}`, product);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.patch<Product>(`/product/${id}/delete`);
    return response.data;
  },

  restore: async (id: string) => {
    const response = await api.patch<Product>(`/product/${id}/restore`);
    return response.data;
  }
};
