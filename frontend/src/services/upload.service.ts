import { apiClient } from '@/lib/apiClient';

export const uploadService = {
  uploadFile: async (
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ url: string; mediaType: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post<{ url: string; mediaType: string }>(
      '/api/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      }
    );

    return res.data;
  },
};
