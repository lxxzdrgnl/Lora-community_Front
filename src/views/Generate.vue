<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { api, type LoraModel, type GenerationProgressResponse } from '../services/api';

const route = useRoute();

// 모델 데이터
const myModels = ref<LoraModel[]>([]);
const communityModels = ref<LoraModel[]>([]);
const selectedModel = ref<LoraModel | null>(null);

// 모달 상태
const showModelModal = ref(false);
const activeTab = ref<'my' | 'community'>('my');
const searchQuery = ref('');
const showOnlyLiked = ref(false);
const isLoadingModels = ref(false);
const loadError = ref('');

// 생성 파라미터
const prompt = ref('');
const negativePrompt = ref('lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality');
const steps = ref(30);
const guidanceScale = ref(7.5);
const numImages = ref(1);
const seed = ref<number | undefined>(undefined);

// 생성 상태
const isGenerating = ref(false);
const generatedImages = ref<string[]>([]);
const error = ref('');
const currentStep = ref(0);
const totalSteps = ref(0);
const statusMessage = ref('');

let eventSource: EventSource | null = null;

// 검색 필터링된 모델 목록
const filteredMyModels = computed(() => {
  if (!searchQuery.value.trim()) return myModels.value;
  const query = searchQuery.value.toLowerCase();
  return myModels.value.filter(m =>
    m.title.toLowerCase().includes(query) ||
    (m.description && m.description.toLowerCase().includes(query)) ||
    (m.characterName && m.characterName.toLowerCase().includes(query))
  );
});

const filteredCommunityModels = computed(() => {
  if (!searchQuery.value.trim()) return communityModels.value;
  const query = searchQuery.value.toLowerCase();
  return communityModels.value.filter(m =>
    m.title.toLowerCase().includes(query) ||
    (m.description && m.description.toLowerCase().includes(query)) ||
    (m.characterName && m.characterName.toLowerCase().includes(query)) ||
    (m.userNickname && m.userNickname.toLowerCase().includes(query))
  );
});

onMounted(async () => {
  await loadModels();

  // URL 파라미터에서 modelId를 읽어서 모델 자동 선택
  const modelId = route.query.modelId;
  if (modelId) {
    await selectModelById(Number(modelId));
  }
});

const loadModels = async () => {
  isLoadingModels.value = true;
  loadError.value = '';
  try {
    // 내 모델 로드
    try {
      const myResponse = await api.models.getMyModels(0, 100);
      myModels.value = myResponse.data.content.filter(m => m.status === 'COMPLETED');
      console.log('✅ My models loaded:', myModels.value.length);
    } catch (myErr) {
      console.error('❌ Failed to load my models:', myErr);
      // 내 모델 로드 실패해도 계속 진행
      myModels.value = [];
    }

    // 커뮤니티 모델 로드
    try {
      if (showOnlyLiked.value) {
        const likedResponse = await api.community.getLikedModels(0, 100);
        communityModels.value = likedResponse.data.content;
        console.log('✅ Liked models loaded:', communityModels.value.length);
      } else {
        const communityResponse = await api.models.getPublicModels(0, 100);
        communityModels.value = communityResponse.data.content;
        console.log('✅ Community models loaded:', communityModels.value.length);
      }
    } catch (commErr) {
      console.error('❌ Failed to load community models:', commErr);
      communityModels.value = [];
      throw commErr; // 커뮤니티 모델은 필수이므로 에러 전파
    }
  } catch (err) {
    console.error('❌ Critical error loading models:', err);
    loadError.value = err instanceof Error ? err.message : 'Failed to load models';
  } finally {
    isLoadingModels.value = false;
  }
};

const toggleLikedFilter = async () => {
  showOnlyLiked.value = !showOnlyLiked.value;
  await loadModels();
};

const openModelModal = () => {
  showModelModal.value = true;
};

const closeModelModal = () => {
  showModelModal.value = false;
};

const selectModel = (model: LoraModel) => {
  selectedModel.value = model;
  closeModelModal();
};

const selectModelById = async (modelId: number) => {
  // 먼저 내 모델에서 찾기
  let model = myModels.value.find(m => m.id === modelId);

  // 없으면 커뮤니티 모델에서 찾기
  if (!model) {
    model = communityModels.value.find(m => m.id === modelId);
  }

  // 그래도 없으면 API로 직접 조회
  if (!model) {
    try {
      const response = await api.models.getModelDetail(modelId);
      model = response.data;
    } catch (err) {
      console.error('Failed to load model:', err);
      return;
    }
  }

  selectedModel.value = model;
};

const startGeneration = async () => {
  if (!selectedModel.value) {
    error.value = 'Please select a model first';
    return;
  }

  if (!prompt.value.trim()) {
    error.value = 'Please enter a prompt';
    return;
  }

  try {
    isGenerating.value = true;
    error.value = '';
    generatedImages.value = [];
    currentStep.value = 0;
    totalSteps.value = steps.value;

    const response = await api.generation.generateImage({
      modelId: selectedModel.value.id,
      prompt: prompt.value,
      negativePrompt: negativePrompt.value,
      steps: steps.value,
      guidanceScale: guidanceScale.value,
      seed: seed.value,
    });

    statusMessage.value = 'Generation started...';

    // Connect to SSE for progress
    connectToProgressStream();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to start generation';
    isGenerating.value = false;
  }
};

const connectToProgressStream = () => {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = api.generation.streamGenerationProgress((data: GenerationProgressResponse) => {
    if (data.status === 'IN_PROGRESS') {
      currentStep.value = data.current_step || 0;
      totalSteps.value = data.total_steps || steps.value;
      statusMessage.value = data.message || 'Generating...';
    } else if (data.status === 'SUCCESS') {
      isGenerating.value = false;
      generatedImages.value = data.image_urls || [];
      statusMessage.value = 'Generation completed!';
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    } else if (data.status === 'FAILED') {
      isGenerating.value = false;
      error.value = data.message || 'Generation failed';
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    }
  });
};

const downloadImage = (url: string, index: number) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = `generated-${Date.now()}-${index}.png`;
  link.click();
};

onUnmounted(() => {
  if (eventSource) {
    eventSource.close();
  }
});
</script>

<template>
  <div class="generate-page">
    <div class="container-sm">
      <!-- Header -->
      <div class="text-center mb-xl">
        <h1 class="text-4xl font-bold gradient-text mb-md">Image Generation</h1>
        <p class="text-lg text-secondary">Create amazing images with your trained LoRA models</p>
      </div>

      <!-- Main Content -->
      <div class="grid grid-cols-2 gap-xl">
        <!-- Left: Configuration -->
        <div class="config-section">
          <div class="card">
            <h2 class="text-2xl font-bold mb-lg">Configuration</h2>

            <!-- Model Selection -->
            <div class="form-group">
              <label class="label">Select Model</label>
              <button
                class="model-select-btn"
                @click="openModelModal"
                :disabled="isGenerating"
              >
                <span v-if="selectedModel" class="text-left flex-1">
                  <span class="font-semibold">{{ selectedModel.title }}</span>
                  <span class="text-sm text-secondary block">by {{ selectedModel.userNickname }}</span>
                </span>
                <span v-else class="text-secondary">Choose a model...</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ml-sm">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>

            <!-- Prompt -->
            <div class="form-group">
              <label class="label">Prompt</label>
              <textarea
                v-model="prompt"
                class="textarea"
                rows="4"
                placeholder="1girl, beautiful, detailed face, high quality..."
                :disabled="isGenerating"
              ></textarea>
            </div>

            <!-- Negative Prompt -->
            <div class="form-group">
              <label class="label">Negative Prompt</label>
              <textarea
                v-model="negativePrompt"
                class="textarea"
                rows="3"
                placeholder="lowres, bad anatomy..."
                :disabled="isGenerating"
              ></textarea>
            </div>

            <!-- Parameters -->
            <div class="grid grid-cols-2 gap-md">
              <div class="form-group">
                <label class="label">Steps: {{ steps }}</label>
                <input
                  v-model.number="steps"
                  type="range"
                  min="10"
                  max="100"
                  class="input"
                  :disabled="isGenerating"
                />
              </div>

              <div class="form-group">
                <label class="label">Guidance Scale: {{ guidanceScale }}</label>
                <input
                  v-model.number="guidanceScale"
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  class="input"
                  :disabled="isGenerating"
                />
              </div>

              <div class="form-group">
                <label class="label">Number of Images</label>
                <input
                  v-model.number="numImages"
                  type="number"
                  min="1"
                  max="4"
                  class="input"
                  :disabled="isGenerating"
                />
              </div>

              <div class="form-group">
                <label class="label">Seed (optional)</label>
                <input
                  v-model.number="seed"
                  type="number"
                  class="input"
                  placeholder="Random"
                  :disabled="isGenerating"
                />
              </div>
            </div>

            <!-- Generate Button -->
            <button
              class="btn btn-primary w-full mt-lg"
              :disabled="isGenerating || !selectedModel"
              @click="startGeneration"
            >
              <svg v-if="isGenerating" class="loading mr-sm" width="20" height="20" viewBox="0 0 24 24"></svg>
              {{ isGenerating ? 'Generating...' : 'Generate Images' }}
            </button>

            <!-- Error Message -->
            <div v-if="error" class="card mt-md p-md" style="background: rgba(224, 224, 224, 0.1); border: 1px solid var(--text-secondary);">
              <p class="text-error text-sm">{{ error }}</p>
            </div>

            <!-- Progress -->
            <div v-if="isGenerating" class="mt-lg">
              <div class="flex justify-between mb-sm">
                <span class="text-sm text-secondary">{{ statusMessage }}</span>
                <span class="text-sm font-semibold">{{ currentStep }} / {{ totalSteps }}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${(currentStep / totalSteps) * 100}%` }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Generated Images -->
        <div class="results-section">
          <div class="card">
            <h2 class="text-2xl font-bold mb-lg">Generated Images</h2>

            <div v-if="generatedImages.length === 0" class="empty-state text-center py-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="mx-auto mb-md" style="color: var(--text-muted);">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <p class="text-secondary">No images generated yet</p>
              <p class="text-sm text-muted mt-sm">Configure your settings and click Generate</p>
            </div>

            <div v-else class="images-grid">
              <div v-for="(url, index) in generatedImages" :key="index" class="image-item">
                <img :src="url" :alt="`Generated ${index + 1}`" class="img-cover rounded" />
                <div class="image-actions mt-sm flex gap-sm">
                  <button class="btn btn-secondary btn-sm flex-1" @click="downloadImage(url, index)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Model Selection Modal -->
    <div v-if="showModelModal" class="modal-overlay" @click="closeModelModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="text-2xl font-bold">Select a Model</h3>
          <button class="modal-close" @click="closeModelModal">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="p-lg" style="border-bottom: 1px solid var(--border);">
          <div style="position: relative;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; z-index: 1;">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              class="input w-full"
              style="padding-left: 48px; padding-right: 48px;"
              placeholder="Search by title, description, character, or creator..."
              @keyup.escape="searchQuery = ''"
            />
            <button
              v-if="searchQuery"
              class="btn-icon btn-ghost"
              style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); padding: 8px;"
              @click="searchQuery = ''"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="modal-tabs">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'my' }"
            @click="activeTab = 'my'"
          >
            내 모델 ({{ filteredMyModels.length }}/{{ myModels.length }})
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'community' }"
            @click="activeTab = 'community'"
          >
            커뮤니티 모델 ({{ filteredCommunityModels.length }}/{{ communityModels.length }})
          </button>
        </div>

        <!-- Liked Filter (for Community tab only) -->
        <div v-if="activeTab === 'community'" class="flex gap-sm mb-md px-lg">
          <button
            class="btn btn-sm"
            :class="showOnlyLiked ? 'btn-primary' : 'btn-secondary'"
            @click="toggleLikedFilter"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" :fill="showOnlyLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            {{ showOnlyLiked ? '좋아요한 모델만 보기' : '전체 모델 보기' }}
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="isLoadingModels" class="modal-body">
          <div class="loading-state text-center py-xl">
            <p class="text-secondary">Loading models...</p>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="loadError" class="modal-body">
          <div class="error-state text-center py-xl">
            <p class="text-error mb-md">{{ loadError }}</p>
            <button class="btn btn-secondary btn-sm" @click="loadModels">Retry</button>
          </div>
        </div>

        <!-- Model List -->
        <div v-else class="modal-body">
          <!-- My Models -->
          <div v-show="activeTab === 'my'" class="model-list">
            <div v-if="filteredMyModels.length === 0" class="empty-state text-center py-xl">
              <p class="text-secondary mb-md" v-if="searchQuery">No models found matching "{{ searchQuery }}"</p>
              <template v-else>
                <p class="text-secondary mb-md">학습된 모델이 없습니다</p>
                <router-link to="/training" class="btn btn-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  모델 학습하러 가기
                </router-link>
              </template>
            </div>
            <div
              v-for="model in filteredMyModels"
              :key="model.id"
              class="card model-item"
              @click="selectModel(model)"
            >
              <div class="flex items-center gap-md">
                <div v-if="model.thumbnailUrl" class="model-thumb">
                  <img :src="model.thumbnailUrl" :alt="model.title" class="img-cover" />
                </div>
                <div class="flex-1">
                  <h4 class="font-semibold mb-xs">{{ model.title }}</h4>
                  <p class="text-sm text-secondary mb-sm">{{ model.description || 'No description' }}</p>
                  <div class="flex items-center gap-md text-xs text-muted">
                    <span class="flex items-center gap-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      {{ model.viewCount || 0 }}
                    </span>
                    <span class="flex items-center gap-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                      {{ model.likeCount || 0 }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Community Models -->
          <div v-show="activeTab === 'community'" class="model-list">
            <div v-if="filteredCommunityModels.length === 0" class="empty-state text-center py-xl">
              <p class="text-secondary" v-if="searchQuery">No models found matching "{{ searchQuery }}"</p>
              <p class="text-secondary" v-else>공개된 모델이 없습니다</p>
            </div>
            <div
              v-for="model in filteredCommunityModels"
              :key="model.id"
              class="card model-item"
              @click="selectModel(model)"
            >
              <div class="flex items-center gap-md">
                <div v-if="model.thumbnailUrl" class="model-thumb">
                  <img :src="model.thumbnailUrl" :alt="model.title" class="img-cover" />
                </div>
                <div class="flex-1">
                  <h4 class="font-semibold mb-xs">{{ model.title }}</h4>
                  <p class="text-sm text-secondary mb-xs">by {{ model.userNickname }}</p>
                  <p class="text-sm text-secondary mb-sm">{{ model.description || 'No description' }}</p>
                  <div class="flex items-center gap-md text-xs text-muted">
                    <span class="flex items-center gap-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      {{ model.viewCount || 0 }}
                    </span>
                    <span class="flex items-center gap-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                      {{ model.likeCount || 0 }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.generate-page {
  padding: var(--space-xl) 0;
  min-height: calc(100vh - 200px);
}

.config-section,
.results-section {
  height: fit-content;
}

/* Model Select Button */
.model-select-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.model-select-btn:hover:not(:disabled) {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

.model-select-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-lg);
}

.modal-content {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--border);
}

.modal-close {
  padding: var(--space-sm);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}


.modal-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
}

.tab-btn {
  flex: 1;
  padding: var(--space-md);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.tab-btn.active {
  color: var(--text-primary);
  border-bottom-color: var(--text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.model-item {
  cursor: pointer;
  transition: all 0.2s ease;
}

.model-item:hover {
  border-color: var(--text-primary);
  box-shadow: var(--shadow-md);
}

.model-thumb {
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-hover);
}

.flex-1 {
  flex: 1;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--bg-hover);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--text-primary);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.images-grid {
  display: grid;
  gap: var(--space-lg);
}

.image-item {
  background: var(--bg-hover);
  padding: var(--space-sm);
  border-radius: var(--radius-md);
}

.image-item img {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
}

.flex-1 {
  flex: 1;
}

.ml-sm {
  margin-left: var(--space-sm);
}

.gap-xs {
  gap: var(--space-xs);
}

@media (max-width: 1024px) {
  .grid-cols-2 {
    grid-template-columns: 1fr;
  }
}
</style>
