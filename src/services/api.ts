// ========== Configuration ==========
const API_BASE_URL = 'http://bluemingai.ap-northeast-2.elasticbeanstalk.com';

// ========== Types ==========
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface LoraModel {
  id: number;
  userId: number;
  userNickname: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  characterName?: string;
  style?: string;
  trainingImagesCount: number;
  baseModel: string;
  isPublic: boolean;
  status: string;
  s3Key?: string;
  viewCount: number;
  likeCount: number;
  favoriteCount: number;
  isLiked?: boolean;
  isFavorited?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModelDetailResponse extends LoraModel {
  samples: ModelSample[];
  prompts: PromptResponse[];
  tags: TagResponse[];
}

export interface ModelSample {
  id: number;
  imageUrl: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface PromptResponse {
  id: number;
  modelId: number;
  title: string;
  prompt: string;
  negativePrompt: string;
  description: string;
  displayOrder: number;
  createdAt: string;
}

export interface TagResponse {
  id: number;
  name: string;
  category: string;
  usageCount: number;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  nickname: string;
  profileImageUrl: string;
  role: string;
  createdAt: string;
}

export interface SearchUserResponse extends UserResponse {
  modelsCount: number;
}

export interface SearchAllResponse {
  models: PageResponse<LoraModel>;
  users: PageResponse<SearchUserResponse>;
}

export interface CommentResponse {
  id: number;
  modelId: number;
  userId: number;
  userNickname: string;
  userProfileImageUrl: string;
  content: string;
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
  replies?: CommentResponse[];
}

export interface TrainingJobResponse {
  id: number;
  modelId: number;
  userId: number;
  status: string;
  currentEpoch: number;
  totalEpochs: number;
  phase: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface GenerateConfig {
  modelId: number;
  prompt: string;
  negativePrompt?: string;
  steps?: number;
  guidanceScale?: number;
  numImages?: number;
  seed?: number;
}

export interface TrainConfig {
  modelId: number;
  epochs?: number;
  learningRate?: number;
  loraRank?: number;
  baseModel?: string;
  isPublic?: boolean;
}

export interface GenerationProgressResponse {
  status: string; // Added status property
  current_step: number;
  total_steps: number;
  message: string;
  image_urls: string[];
  error?: string;
}

// ========== Auth Helper ==========
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let errorMessage = `HTTP Error: ${response.status}`;
    try {
      const error = await response.json();
      console.error('API Error Response:', error);
      errorMessage = error.message || error.error || errorMessage;
    } catch (e) {
      console.error('Failed to parse error response:', e);
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

// ========== API Methods ==========
export const api = {
  // ========== Auth ==========
  auth: {
    async googleLogin(): Promise<void> {
      window.location.href = `${API_BASE_URL}/api/auth/google?prompt=select_account`;
    },

    async getCurrentUser(): Promise<ApiResponse<Record<string, unknown>>> {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      return handleResponse(response);
    },

    async logout(refreshToken: string): Promise<ApiResponse<void>> {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ refreshToken }),
      });
      return handleResponse(response);
    },
  },

  // ========== Prompts ==========
  prompts: {
    async createPrompt(modelId: number, data: {
      title: string;
      prompt: string;
      negativePrompt: string;
      description?: string;
    }): Promise<ApiResponse<PromptResponse>> {
      const response = await fetch(`${API_BASE_URL}/api/models/${modelId}/prompts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },

    async updatePrompt(modelId: number, promptId: number, data: {
      title?: string;
      prompt?: string;
      negativePrompt?: string;
      description?: string;
    }): Promise<ApiResponse<PromptResponse>> {
      const response = await fetch(`${API_BASE_URL}/api/models/${modelId}/prompts/${promptId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },

    async deletePrompt(modelId: number, promptId: number): Promise<ApiResponse<void>> {
      const response = await fetch(`${API_BASE_URL}/api/models/${modelId}/prompts/${promptId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
  },

  // ========== Models ==========
  models: {
    async getPublicModels(page = 0, size = 20): Promise<ApiResponse<PageResponse<LoraModel>>> {
      const response = await fetch(
        `${API_BASE_URL}/api/models?page=${page}&size=${size}&sort=createdAt,DESC`,
        { headers: getAuthHeaders() }
      );
      return handleResponse(response);
    },

    async getPopularModels(page = 0, size = 20): Promise<ApiResponse<PageResponse<LoraModel>>> {
      const response = await fetch(
        `${API_BASE_URL}/api/models/popular?page=${page}&size=${size}`,
        { headers: getAuthHeaders() }
      );
      return handleResponse(response);
    },

    async getModelDetail(modelId: number): Promise<ApiResponse<ModelDetailResponse>> {
      const response = await fetch(`${API_BASE_URL}/api/models/${modelId}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    async getMyModels(page = 0, size = 20): Promise<ApiResponse<PageResponse<LoraModel>>> {
      const response = await fetch(
        `${API_BASE_URL}/api/models/my?page=${page}&size=${size}`,
        { headers: getAuthHeaders() }
      );
      return handleResponse(response);
    },

    async createModel(data: {
      title: string;
      description: string;
      characterName?: string;
      style?: string;
      isPublic: boolean;
    }): Promise<ApiResponse<LoraModel>> {
      const response = await fetch(`${API_BASE_URL}/api/models`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },

    async updateModel(
      modelId: number,
      data: Partial<{
        title: string;
        description: string;
        characterName: string;
        style: string;
        isPublic: boolean;
      }>
    ): Promise<ApiResponse<LoraModel>> {
      const response = await fetch(`${API_BASE_URL}/api/models/${modelId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },

    async deleteModel(modelId: number): Promise<ApiResponse<void>> {
      const response = await fetch(`${API_BASE_URL}/api/models/${modelId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    async searchModels(query: string, page = 0, size = 20): Promise<ApiResponse<PageResponse<LoraModel>>> {
      const response = await fetch(
        `${API_BASE_URL}/api/models/search?query=${encodeURIComponent(query)}&page=${page}&size=${size}`,
        { headers: getAuthHeaders() }
      );
      return handleResponse(response);
    },

    async filterByTags(tags: string[], page = 0, size = 20): Promise<ApiResponse<PageResponse<LoraModel>>> {
      const tagParams = tags.map(tag => `tags=${encodeURIComponent(tag)}`).join('&');
      const response = await fetch(
        `${API_BASE_URL}/api/models/filter?${tagParams}&page=${page}&size=${size}`,
        { headers: getAuthHeaders() }
      );
      return handleResponse(response);
    },
  },

  // ========== Community ==========
  community: {
    async toggleLike(modelId: number): Promise<ApiResponse<{ liked: boolean }>> {
      const response = await fetch(`${API_BASE_URL}/api/models/${modelId}/like`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    async toggleFavorite(modelId: number): Promise<ApiResponse<{ favorited: boolean }>> {
      const response = await fetch(`${API_BASE_URL}/api/models/${modelId}/favorite`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    async toggleCommentLike(modelId: number, commentId: number): Promise<ApiResponse<{ isLiked: boolean }>> {
      const response = await fetch(`${API_BASE_URL}/api/models/${modelId}/comments/${commentId}/like`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    async getComments(modelId: number, page = 0, size = 20): Promise<ApiResponse<PageResponse<CommentResponse>>> {
      const response = await fetch(
        `${API_BASE_URL}/api/models/${modelId}/comments?page=${page}&size=${size}`,
        { headers: getAuthHeaders() }
      );
      return handleResponse(response);
    },

    async createComment(modelId: number, content: string, parentCommentId?: number): Promise<ApiResponse<CommentResponse>> {
      const response = await fetch(`${API_BASE_URL}/api/models/${modelId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content, parentCommentId }),
      });
      return handleResponse(response);
    },

    async deleteComment(modelId: number, commentId: number): Promise<ApiResponse<void>> {
      const response = await fetch(`${API_BASE_URL}/api/models/${modelId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    async getFavoriteModels(page = 0, size = 20): Promise<ApiResponse<PageResponse<LoraModel>>> {
      const response = await fetch(
        `${API_BASE_URL}/api/models/favorites?page=${page}&size=${size}`,
        { headers: getAuthHeaders() }
      );
      return handleResponse(response);
    },

    async getLikedModels(page = 0, size = 20): Promise<ApiResponse<PageResponse<LoraModel>>> {
      const response = await fetch(
        `${API_BASE_URL}/api/models/likes?page=${page}&size=${size}`,
        { headers: getAuthHeaders() }
      );
      return handleResponse(response);
    },
  },

  // ========== Tags ==========
  tags: {
    async getAllTags(): Promise<ApiResponse<TagResponse[]>> {
      const response = await fetch(`${API_BASE_URL}/api/tags`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    async getPopularTags(): Promise<ApiResponse<TagResponse[]>> {
      const response = await fetch(`${API_BASE_URL}/api/tags/popular`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    async searchTags(keyword: string): Promise<ApiResponse<TagResponse[]>> {
      const response = await fetch(
        `${API_BASE_URL}/api/tags/search?keyword=${encodeURIComponent(keyword)}`,
        { headers: getAuthHeaders() }
      );
      return handleResponse(response);
    },

    async addTagToModel(modelId: number, tagName: string, category?: string): Promise<ApiResponse<void>> {
      const response = await fetch(`${API_BASE_URL}/api/tags/models/${modelId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tagName, category }),
      });
      return handleResponse(response);
    },

    async removeTagFromModel(modelId: number, tagId: number): Promise<ApiResponse<void>> {
      const response = await fetch(`${API_BASE_URL}/api/tags/models/${modelId}/tags/${tagId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
  },

  // ========== User ==========
  user: {
    async getMyProfile(): Promise<ApiResponse<UserResponse>> {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    async updateMyProfile(data: { nickname?: string; profileImageUrl?: string }): Promise<ApiResponse<UserResponse>> {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },

    async getUserProfile(userId: number): Promise<ApiResponse<UserResponse>> {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
  },

  // ========== Upload ==========
  upload: {
    async getPresignedUrls(fileNames: string[]): Promise<ApiResponse<{ uploadUrls: string[]; downloadUrls: string[] }>> {
      const response = await fetch(`${API_BASE_URL}/api/training/upload-urls`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ fileNames }),
      });
      return handleResponse(response);
    },

    async uploadToS3(presignedUrl: string, file: File): Promise<void> {
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to upload file to S3');
      }
    },
  },

  // ========== Training ==========
  training: {
    async createModel(data: {
      title: string;
      description?: string;
      characterName?: string;
      style?: string;
      trainingImagesCount?: number;
      epochs?: number;
      learningRate?: number;
      loraRank?: number;
      baseModel?: string;
      isPublic?: boolean;
    }): Promise<ApiResponse<LoraModel>> {
      const response = await fetch(`${API_BASE_URL}/api/models`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },

    async createTrainingJob(modelId: number): Promise<ApiResponse<TrainingJobResponse>> {
      const response = await fetch(`${API_BASE_URL}/api/training/models/${modelId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    async startTraining(jobId: number, config: {
      totalEpochs: number;
      modelName: string;
      trainingImageUrls: string[];
      callbackBaseUrl?: string;
    }): Promise<ApiResponse<Record<string, unknown>>> {
      const response = await fetch(`${API_BASE_URL}/api/training/jobs/${jobId}/start`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(config),
      });
      return handleResponse(response);
    },

    async getTrainingJob(jobId: number): Promise<ApiResponse<TrainingJobResponse>> {
      const response = await fetch(`${API_BASE_URL}/api/training/jobs/${jobId}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    async getMyTrainingJobs(): Promise<ApiResponse<TrainingJobResponse[]>> {
      const response = await fetch(`${API_BASE_URL}/api/training/my`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    async deleteTrainingJob(jobId: number): Promise<ApiResponse<void>> {
      const response = await fetch(`${API_BASE_URL}/api/training/jobs/${jobId}/fail`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ error: 'User cancelled' }),
      });
      return handleResponse(response);
    },

    streamTrainingProgress(onMessage: (data: Record<string, unknown>) => void): EventSource {
      const eventSource = new EventSource(`${API_BASE_URL}/api/training/stream`);
      eventSource.onmessage = (event) => {
        onMessage(JSON.parse(event.data));
      };
      return eventSource;
    },
  },

  // ========== Generation ==========
  generation: {
    async generateImage(data: {
      modelId: number;
      prompt: string;
      negativePrompt?: string;
      steps?: number;
      guidanceScale?: number;
      numImages?: number;
      seed?: number;
    }): Promise<ApiResponse<Record<string, unknown>>> {
      console.log('API Request - POST /api/generate:', data);
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      console.log('API Response status:', response.status);
      return handleResponse(response);
    },

    async getMyGenerationHistory(page = 0, size = 20): Promise<ApiResponse<PageResponse<unknown>>> {
      const response = await fetch(
        `${API_BASE_URL}/api/generate/history/my?page=${page}&size=${size}`,
        { headers: getAuthHeaders() }
      );
      return handleResponse(response);
    },

    streamGenerationProgress(onMessage: (data: GenerationProgressResponse) => void): EventSource {
      const eventSource = new EventSource(`${API_BASE_URL}/api/generate/stream`);
      eventSource.onmessage = (event) => {
        onMessage(JSON.parse(event.data));
      };
      return eventSource;
    },
  },

  // ========== Search ==========
  search: {
    async search(query: string, page = 0, size = 20): Promise<ApiResponse<SearchAllResponse>> {
      const response = await fetch(
        `${API_BASE_URL}/api/search?query=${encodeURIComponent(query)}&page=${page}&size=${size}`,
        { headers: getAuthHeaders() }
      );
      return handleResponse(response);
    },

    async searchModels(query: string, page = 0, size = 20): Promise<ApiResponse<PageResponse<LoraModel>>> {
      const response = await fetch(
        `${API_BASE_URL}/api/search/models?query=${encodeURIComponent(query)}&page=${page}&size=${size}`,
        { headers: getAuthHeaders() }
      );
      return handleResponse(response);
    },

    async searchUsers(query: string, page = 0, size = 20): Promise<ApiResponse<PageResponse<SearchUserResponse>>> {
      const response = await fetch(
        `${API_BASE_URL}/api/search/users?query=${encodeURIComponent(query)}&page=${page}&size=${size}`,
        { headers: getAuthHeaders() }
      );
      return handleResponse(response);
    },
  },
};

// ========== Auth Store ==========
export const authStore = {
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  },

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  },

  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },
};