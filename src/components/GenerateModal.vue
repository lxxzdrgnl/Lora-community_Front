<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { api, type LoraModel, type GenerationProgressResponse } from '../services/api';

const props = defineProps<{
  show: boolean;
  initialModelId?: number | null;
}>();

const emit = defineEmits(['close']);

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

let currentHistoryId: number | null = null;
let pollingInterval: ReturnType<typeof setInterval> | null = null;

// Watch for the modal to open
watch(() => props.show, async (newVal) => {
  if (newVal) {
    // Reset state when opening
    generatedImages.value = [];
    error.value = '';
    prompt.value = '';
    selectedModel.value = null;
    currentHistoryId = null;
    isGenerating.value = false;
    currentStep.value = 0;
    totalSteps.value = 0;
    statusMessage.value = '';

    await loadModels();
    if (props.initialModelId) {
      await selectModelById(props.initialModelId);
    }

    // 진행 중인 작업 확인
    await checkOngoingGeneration();
  } else {
    // 모달 닫을 때 폴링 종료
    stopPolling();
    currentHistoryId = null;
  }
});

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

const checkOngoingGeneration = async () => {
  try {
    const response = await api.generation.getOngoingGeneration();

    if (response.data && response.data.id) {
      // 진행 중인 작업이 있음
      console.log('🔄 진행 중인 작업 발견:', response.data);

      currentHistoryId = response.data.id;
      isGenerating.value = true;

      // 초기 상태
      currentStep.value = response.data.currentStep || 0;
      totalSteps.value = response.data.totalSteps || 0;
      statusMessage.value = '모델 불러오는 중...';

      // 모델 정보 복원
      if (response.data.modelId) {
        await selectModelById(response.data.modelId);
      }

      // 프롬프트 정보 복원
      prompt.value = response.data.prompt || '';
      negativePrompt.value = response.data.negativePrompt || '';
      steps.value = response.data.steps || 30;
      guidanceScale.value = response.data.guidanceScale || 7.5;
      numImages.value = response.data.numImages || 1;
      seed.value = response.data.seed;

      // 폴링 시작
      startPolling();

      console.log('✅ 폴링 재시작. historyId:', currentHistoryId);
    } else {
      console.log('✅ 진행 중인 작업 없음');
    }
  } catch (err) {
    console.error('❌ 진행 중인 작업 확인 실패:', err);
  }
};

const loadModels = async () => {
  isLoadingModels.value = true;
  loadError.value = '';
  try {
    // 내 모델 로드 (COMPLETED 상태이고 s3Key가 있는 것만)
    try {
      const myResponse = await api.models.getMyModels(0, 100);
      myModels.value = myResponse.data.content.filter(m => {
        console.log(`Model ${m.id}: status=${m.status}, s3Key=${m.s3Key || 'null'}`);
        return m.status === 'COMPLETED' && m.s3Key;
      });
      console.log('My usable models (with s3Key):', myModels.value.length);
    } catch (myErr) {
      myModels.value = [];
    }

    // 커뮤니티 모델 로드
    try {
      if (showOnlyLiked.value) {
        const likedResponse = await api.community.getLikedModels(0, 100);
        communityModels.value = likedResponse.data.content;
      } else {
        const communityResponse = await api.models.getPublicModels(0, 100);
        communityModels.value = communityResponse.data.content;
      }
    } catch (commErr) {
      communityModels.value = [];
      throw commErr;
    }
  } catch (err) {
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
  if (!model.s3Key) {
    error.value = `모델 "${model.title}"의 학습 파일이 아직 업로드되지 않았습니다. 학습이 완전히 완료된 후 다시 시도해주세요.`;
    closeModelModal();
    return;
  }
  selectedModel.value = model;
  closeModelModal();
};

const selectModelById = async (modelId: number) => {
  let model = myModels.value.find(m => m.id === modelId) || communityModels.value.find(m => m.id === modelId);
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

  // 이미 진행 중인 작업이 있으면 무시 (UI는 진행 중 상태 유지)
  if (isGenerating.value) {
    console.log('⚠️ 이미 진행 중인 작업이 있습니다. 요청 무시.');
    return;
  }

  try {
    isGenerating.value = true;
    error.value = '';
    generatedImages.value = [];

    // 초기 상태: 모델 불러오는 중 (SSE에서 진행률 오기 전)
    currentStep.value = 0;
    totalSteps.value = 0;
    statusMessage.value = '모델 불러오는 중...';

    // Prepare payload - only include defined values
    const payload: Record<string, unknown> = {
      modelId: selectedModel.value.id,
      prompt: prompt.value,
    };

    if (negativePrompt.value) {
      payload.negativePrompt = negativePrompt.value;
    }
    if (steps.value) {
      payload.steps = steps.value;
    }
    if (guidanceScale.value) {
      payload.guidanceScale = guidanceScale.value;
    }
    if (numImages.value) {
      payload.numImages = numImages.value;
    }
    if (seed.value !== undefined && seed.value !== null) {
      payload.seed = seed.value;
    }

    console.log('Sending generation request:', payload);

    const response = await api.generation.generateImage(payload as any);
    console.log('Generation response:', response);

    // historyId 저장
    if (response.data && response.data.historyId) {
      currentHistoryId = response.data.historyId as number;
      console.log('📝 Generation started. historyId:', currentHistoryId);

      // 폴링 시작 (1초마다)
      startPolling();
    } else {
      throw new Error('historyId를 받지 못했습니다');
    }
  } catch (err) {
    console.error('Generation error:', err);
    if (err instanceof Error) {
      error.value = `생성 실패: ${err.message}`;
    } else {
      error.value = '이미지 생성을 시작할 수 없습니다.';
    }
    isGenerating.value = false;
  }
};

// 폴링 시작 (1초마다 상태 확인)
const startPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  console.log('🔄 폴링 시작 - historyId:', currentHistoryId);
  statusMessage.value = '모델 불러오는 중...';

  pollingInterval = setInterval(async () => {
    if (!currentHistoryId) {
      stopPolling();
      return;
    }

    try {
      const response = await api.generation.getGenerationHistory(currentHistoryId);
      console.log('📊 폴링 응답:', response.data);

      const history = response.data;

      if (history.status === 'SUCCESS') {
        console.log('✅ 생성 완료!', history);
        isGenerating.value = false;
        statusMessage.value = 'Generation completed!';

        // S3 URLs 추출
        if (history.generatedImages && Array.isArray(history.generatedImages)) {
          generatedImages.value = history.generatedImages.map((img: any) => img.s3Url);
          console.log('🖼️ 생성된 이미지 URLs:', generatedImages.value);
        } else {
          console.error('❌ generatedImages 없음:', history);
          error.value = '이미지 생성은 완료되었으나 이미지를 찾을 수 없습니다.';
        }

        stopPolling();
        currentHistoryId = null;
      } else if (history.status === 'FAILED') {
        console.error('❌ 생성 실패:', history.errorMessage);
        isGenerating.value = false;
        error.value = history.errorMessage || 'Generation failed';
        stopPolling();
        currentHistoryId = null;
      } else {
        // GENERATING 상태 - 진행률 업데이트
        if (history.currentStep !== undefined && history.totalSteps !== undefined) {
          currentStep.value = history.currentStep;
          totalSteps.value = history.totalSteps;
          statusMessage.value = `Generating... (${history.currentStep}/${history.totalSteps})`;
          console.log(`📊 진행률: ${history.currentStep}/${history.totalSteps}`);
        } else {
          statusMessage.value = 'Generating...';
          console.log('📊 상태: GENERATING (진행률 정보 없음)');
        }
      }
    } catch (err) {
      console.error('❌ 폴링 에러:', err);
      // 에러가 계속 발생하면 폴링 중지
      error.value = `폴링 에러: ${err instanceof Error ? err.message : String(err)}`;
      statusMessage.value = 'Error checking status';
      stopPolling();
      isGenerating.value = false;
    }
  }, 1000); // 1초마다
};

const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('⏹️ 폴링 중지');
  }
};

const downloadImage = (url: string, index: number) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = `generated-${Date.now()}-${index}.png`;
  link.click();
};

const closeModal = () => {
  emit('close');
};

onUnmounted(() => {
  // 컴포넌트 언마운트 시 폴링 중지
  stopPolling();
});
</script>

<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h1 class="text-3xl font-bold gradient-text">Image Generation</h1>
        <button class="modal-close" @click="closeModal">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="modal-body-content hide-scrollbar">
        <div class="grid grid-cols-2 gap-xl">
          <!-- Left: Configuration -->
          <div class="config-section">
            <div class="card">
              <h2 class="text-2xl font-bold mb-lg gradient-text">Configuration</h2>

              <!-- Model Selection -->
              <div class="form-group">
                <label class="label">Select Model</label>
                <button class="model-select-btn" @click="openModelModal" :disabled="isGenerating">
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
                <textarea v-model="prompt" class="textarea" rows="4" placeholder="1girl, beautiful, detailed face, high quality..." :disabled="isGenerating"></textarea>
              </div>

              <!-- Negative Prompt -->
              <div class="form-group">
                <label class="label">Negative Prompt</label>
                <textarea v-model="negativePrompt" class="textarea" rows="3" placeholder="lowres, bad anatomy..." :disabled="isGenerating"></textarea>
              </div>

              <!-- Parameters -->
              <div class="grid grid-cols-2 gap-md">
                <div class="form-group">
                  <label class="label">Steps: {{ steps }}</label>
                  <input v-model.number="steps" type="range" min="10" max="100" class="input" :disabled="isGenerating" />
                </div>
                <div class="form-group">
                  <label class="label">Guidance Scale: {{ guidanceScale }}</label>
                  <input v-model.number="guidanceScale" type="range" min="1" max="20" step="0.5" class="input" :disabled="isGenerating" />
                </div>
                <div class="form-group">
                  <label class="label">Number of Images</label>
                  <input v-model.number="numImages" type="number" min="1" max="4" class="input" :disabled="isGenerating" />
                </div>
                <div class="form-group">
                  <label class="label">Seed (optional)</label>
                  <input v-model.number="seed" type="number" class="input" placeholder="Random" :disabled="isGenerating" />
                </div>
              </div>

              <!-- Generate Button -->
              <button class="btn btn-primary w-full mt-lg" :disabled="isGenerating || !selectedModel" @click="startGeneration">
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
                  <span v-if="totalSteps > 0" class="text-sm font-semibold">{{ currentStep }} / {{ totalSteps }}</span>
                </div>
                <div v-if="totalSteps > 0" class="progress-bar">
                  <div class="progress-fill" :style="{ width: `${(currentStep / totalSteps) * 100}%` }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Generated Images -->
          <div class="results-section">
            <div class="card">
              <h2 class="text-2xl font-bold mb-lg gradient-text">Generated Images</h2>
              <div v-if="generatedImages.length === 0" class="empty-state text-center py-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="mx-auto mb-md" style="color: var(--text-muted);">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <p class="text-secondary">Your generated images will appear here</p>
                <p class="text-sm text-muted mt-sm">Configure your settings and click Generate</p>
              </div>
              <div v-else class="images-grid">
                <div v-for="(url, index) in generatedImages" :key="index" class="image-item">
                  <img :src="url" :alt="`Generated ${index + 1}`" class="img-cover" />
                  <div class="image-actions">
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
    </div>

    <!-- Model Selection Modal -->
    <div v-if="showModelModal" class="modal-overlay-inner" @click="closeModelModal">
      <div class="modal-content-inner" @click.stop>
        <div class="modal-header">
          <h3 class="text-2xl font-bold">Select a Model</h3>
          <button class="modal-close" @click="closeModelModal">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="p-lg" style="border-bottom: 1px solid var(--border);">
          <div style="position: relative;">
            <input v-model="searchQuery" type="text" class="input w-full" style="padding-left: 48px;" placeholder="Search models..." />
          </div>
        </div>

        <div class="modal-tabs">
          <button class="tab-btn" :class="{ active: activeTab === 'my' }" @click="activeTab = 'my'">
            My Models ({{ filteredMyModels.length }})
          </button>
          <button class="tab-btn" :class="{ active: activeTab === 'community' }" @click="activeTab = 'community'">
            Community ({{ filteredCommunityModels.length }})
          </button>
        </div>

        <div v-if="activeTab === 'community'" class="flex gap-sm mb-md px-lg">
          <button class="btn btn-sm" :class="showOnlyLiked ? 'btn-primary' : 'btn-secondary'" @click="toggleLikedFilter">
            Liked Models
          </button>
        </div>

        <div v-if="isLoadingModels" class="modal-body">
          <p>Loading...</p>
        </div>
        <div v-else-if="loadError" class="modal-body">
          <p class="text-error">{{ loadError }}</p>
        </div>
        <div v-else class="modal-body">
          <div v-show="activeTab === 'my'" class="model-list">
            <div v-if="filteredMyModels.length === 0" class="text-center py-xl">
              <p>No models found.</p>
            </div>
            <div v-for="model in filteredMyModels" :key="model.id" class="card model-item" @click="selectModel(model)">
              <h4>{{ model.title }}</h4>
              <p>{{ model.description }}</p>
            </div>
          </div>
          <div v-show="activeTab === 'community'" class="model-list">
            <div v-if="filteredCommunityModels.length === 0" class="text-center py-xl">
              <p>No models found.</p>
            </div>
            <div v-for="model in filteredCommunityModels" :key="model.id" class="model-item" @click="selectModel(model)">
              <img :src="model.thumbnailUrl || 'https://via.placeholder.com/150'" alt="Model thumbnail" class="model-item-image">
              <div class="model-item-info">
                <h4>{{ model.title }}</h4>
                <p class="model-item-description">{{ model.description }}</p>
                <p class="model-item-author">by {{ model.userNickname }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.modal-close {
  padding: var(--space-sm);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-md);
}

.modal-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-body-content {
  padding: var(--space-xl);
  overflow-y: auto;
}

.config-section,
.results-section {
  height: fit-content;
}

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
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-lg);
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-hover);
}

.image-item .img-cover {
  transition: transform 0.3s ease;
}

.image-item:hover .img-cover {
  transform: scale(1.05);
}

.image-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-item:hover .image-actions {
  opacity: 1;
}

.modal-overlay-inner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001; /* Higher z-index for the inner modal */
}

.modal-content-inner {
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
}

.tab-btn.active {
  color: var(--text-primary);
  border-bottom: 2px solid var(--text-primary);
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
  border-radius: var(--radius-md);
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  transition: background-color 0.2s ease;
  border: 1px solid var(--border); /* Adding a border to make it look like a card */
}

.model-item:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
}

.model-item-image {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}

.model-item-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  overflow: hidden;
  text-overflow: ellipsis;
}

.model-item-info h4 {
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
}

.model-item-description {
  font-size: 14px;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  margin: 0;
  flex-grow: 1;
}

.model-item-author {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
  margin-top: auto;
}

@media (max-width: 1024px) {
  .grid-cols-2 {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: var(--space-sm);
  }
  .modal-body-content {
    padding: var(--space-md);
  }
}
</style>
