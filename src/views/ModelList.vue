<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ModelCard from '../components/ModelCard.vue';
import GenerateModal from '../components/GenerateModal.vue';
import ModelDetailModal from '../components/ModelDetailModal.vue';
import { api, type LoraModel, type TagResponse } from '../services/api';

const models = ref<LoraModel[]>([]);
const loading = ref(true);
const error = ref('');
const activeTab = ref<'recent' | 'popular'>('popular');
const selectedTags = ref<string[]>([]);
const popularTags = ref<TagResponse[]>([]);
const searchQuery = ref('');
const showGenerateModal = ref(false);
const showModelDetailModal = ref(false);
const selectedModelId = ref<number | null>(null);

// Pagination
const currentPage = ref(0);
const totalPages = ref(0);
const pageSize = 20;

onMounted(async () => {
  await loadPopularTags();
  await fetchModels();
});

const loadPopularTags = async () => {
  try {
    const response = await api.tags.getPopularTags();
    popularTags.value = response.data;
  } catch (err) {
    console.error('Failed to load tags:', err);
  }
};

const fetchModels = async () => {
  loading.value = true;
  error.value = '';

  try {
    let response;

    if (searchQuery.value.trim()) {
      // Search by query
      response = await api.search.searchModels(searchQuery.value, currentPage.value, pageSize);
    } else if (selectedTags.value.length > 0) {
      response = await api.models.filterByTags(selectedTags.value, currentPage.value, pageSize);
      console.log('Filtered models response:', response.data.content);
    } else if (activeTab.value === 'popular') {
      response = await api.models.getPopularModels(currentPage.value, pageSize);
    } else {
      response = await api.models.getPublicModels(currentPage.value, pageSize);
    }

    models.value = response.data.content;
    totalPages.value = response.data.totalPages;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load models';
    console.error('Failed to fetch models:', err);
  } finally {
    loading.value = false;
  }
};

const toggleTag = (tagName: string) => {
  const index = selectedTags.value.indexOf(tagName);
  if (index > -1) {
    selectedTags.value.splice(index, 1);
  } else {
    selectedTags.value.push(tagName);
  }
  currentPage.value = 0;
  fetchModels();
};

const changeTab = (tab: 'recent' | 'popular') => {
  activeTab.value = tab;
  currentPage.value = 0;
  selectedTags.value = [];
  fetchModels();
};

const goToPage = (page: number) => {
  currentPage.value = page;
  fetchModels();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleSearch = () => {
  currentPage.value = 0;
  selectedTags.value = [];
  fetchModels();
};

const clearSearch = () => {
  searchQuery.value = '';
  currentPage.value = 0;
  fetchModels();
};

const openGenerateModal = (modelId: number | null = null) => {
  selectedModelId.value = modelId;
  showGenerateModal.value = true;
};

const closeGenerateModal = () => {
  showGenerateModal.value = false;
  selectedModelId.value = null;
};

const openModelDetailModal = (modelId: number) => {
  console.log('Opening detail modal for model ID:', modelId);
  selectedModelId.value = modelId;
  showModelDetailModal.value = true;
};

const closeModelDetailModal = () => {
  showModelDetailModal.value = false;
  selectedModelId.value = null;
};

const handleOpenGenerate = (modelId: number) => {
  closeModelDetailModal();
  // Use a timeout to ensure the detail modal is closed before opening the generate modal
  setTimeout(() => {
    openGenerateModal(modelId);
  }, 150);
};
</script>

<template>
  <div>
    <header class="hero-section">
      <div class="animation-container">
        <div class="shape shape1"></div>
        <div class="shape shape2"></div>
        <div class="shape shape3"></div>
      </div>
      <h1 class="hero-title">
        Where AI Blossoms
      </h1>
      <p class="hero-subtitle">
        Blueming AI is where your ideas come to life. <br />
        Explore, create, and share with a global community.
      </p>
      <div class="hero-actions">
        <button class="btn btn-primary btn-lg custom-shadow-glow">
          Start Creating
        </button>
      </div>
    </header>

    <div class="container">
      <div class="search-container">
        <div class="flex gap-sm">
          <input
            v-model="searchQuery"
            type="text"
            class="input flex-1"
            placeholder="Search models..."
            @keyup.enter="handleSearch"
          />
          <button class="btn btn-primary" @click="handleSearch">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
        </div>
      </div>

      <section class="filters mb-xl">
        <div class="flex items-center justify-between mb-lg flex-wrap gap-md">
          <div class="tabs-group flex gap-sm" v-if="!searchQuery">
            <button
              class="btn"
              :class="activeTab === 'popular' ? 'btn-primary' : 'btn-secondary'"
              @click="changeTab('popular')"
            >
              Popular
            </button>
            <button
              class="btn"
              :class="activeTab === 'recent' ? 'btn-primary' : 'btn-secondary'"
              @click="changeTab('recent')"
            >
              Recent
            </button>
          </div>
          <button @click="openGenerateModal(null)" class="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Generate
          </button>
        </div>
        <div v-if="popularTags.length" class="tags-filter">
          <div class="flex flex-wrap gap-sm">
            <button
              v-for="tag in popularTags"
              :key="tag.id"
              class="tag"
              :class="{ active: selectedTags.includes(tag.name) }"
              @click="toggleTag(tag.name)"
            >
              {{ tag.name }}
            </button>
          </div>
        </div>
      </section>

      <div v-if="error" class="card mb-lg p-lg text-center">
        <p class="text-error mb-md">{{ error }}</p>
        <button class="btn btn-secondary" @click="fetchModels">Retry</button>
      </div>

      <section class="models-grid">
        <div v-if="loading" class="grid grid-cols-4 gap-lg">
          <div v-for="i in 8" :key="i" class="skeleton-card">
            <div class="skeleton" style="aspect-ratio: 4/3; border-radius: var(--radius-lg);"></div>
            <div class="skeleton mt-md" style="height: 24px; width: 80%;"></div>
            <div class="skeleton mt-sm" style="height: 16px; width: 60%;"></div>
          </div>
        </div>
        <div v-else-if="models.length" class="grid grid-cols-4 gap-lg">
          <ModelCard
            v-for="model in models"
            :key="model.id"
            :id="model.id"
            :title="model.title"
            :description="model.description"
            :userNickname="model.userNickname"
            :likeCount="model.likeCount"
            :viewCount="model.viewCount"
            :favoriteCount="model.favoriteCount"
            :isLiked="model.isLiked"
            :thumbnailUrl="model.thumbnailUrl"
            @click="openModelDetailModal(model.id)"
          />
        </div>
        <div v-else class="empty-state card text-center py-xl">
          <p class="text-secondary text-lg">No models found</p>
        </div>
      </section>

      <div v-if="totalPages > 1" class="pagination flex justify-center gap-sm mt-xl">
        <button
          class="btn btn-secondary btn-sm"
          :disabled="currentPage === 0"
          @click="goToPage(currentPage - 1)"
        >
          Previous
        </button>
        <button
          v-for="page in Math.min(5, totalPages)"
          :key="page - 1"
          class="btn btn-sm"
          :class="currentPage === page - 1 ? 'btn-primary' : 'btn-secondary'"
          @click="goToPage(page - 1)"
        >
          {{ page }}
        </button>
        <button
          class="btn btn-secondary btn-sm"
          :disabled="currentPage >= totalPages - 1"
          @click="goToPage(currentPage + 1)"
        >
          Next
        </button>
      </div>
    </div>
  </div>
  <GenerateModal :show="showGenerateModal" :initial-model-id="selectedModelId" @close="closeGenerateModal" />
  <ModelDetailModal
    :show="showModelDetailModal"
    :model-id="selectedModelId"
    @close="closeModelDetailModal"
    @open-generate="handleOpenGenerate"
    @model-update="fetchModels"
  />
</template>

<style scoped>
.hero-section {
  text-align: center;
  padding: 10rem 1rem 8rem;
  position: relative;
  overflow: hidden;
  background: var(--bg-dark);
}

.animation-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
}

.shape {
  position: absolute;
  mix-blend-mode: screen;
  filter: blur(120px);
}

.shape1 {
  width: 500px;
  height: 500px;
  background: rgba(0, 71, 171, 0.25);
  top: -150px;
  left: -150px;
  border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
  animation: move1 25s infinite alternate;
}

.shape2 {
  width: 400px;
  height: 400px;
  background: rgba(0, 207, 255, 0.2);
  bottom: -100px;
  right: -100px;
  border-radius: 60% 40% 30% 70% / 50% 60% 40% 50%;
  animation: move2 30s infinite alternate-reverse;
}

.shape3 {
  width: 350px;
  height: 350px;
  background: rgba(79, 70, 229, 0.2);
  bottom: 50px;
  left: 15%;
  border-radius: 50% 50% 30% 70% / 60% 40% 60% 40%;
  animation: move3 20s infinite alternate;
}

@keyframes move1 {
  from { transform: translate(0, 0) rotate(0deg) scale(1); }
  to { transform: translate(100px, 50px) rotate(45deg) scale(1.1); }
}
@keyframes move2 {
  from { transform: translate(0, 0) rotate(0deg) scale(1); }
  to { transform: translate(-80px, -40px) rotate(-30deg) scale(1.2); }
}
@keyframes move3 {
  from { transform: translate(0, 0) rotate(0deg) scale(1); }
  to { transform: translate(50px, -100px) rotate(60deg) scale(1.1); }
}

.hero-title, .hero-subtitle, .hero-actions {
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: 4.5rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.hero-subtitle {
  font-size: 1.25rem;
  color: var(--text-secondary);
  max-width: 42rem;
  margin: 0 auto 2.5rem;
  line-height: 1.6;
}

.search-container {
  max-width: 600px;
  margin: 0 auto;
  margin-bottom: var(--space-xl);
  background: rgba(var(--bg-card-rgb), 0.5);
  padding: var(--space-sm);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  position: relative;
  z-index: 2;
  margin-top: -50px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.filters {
  padding-top: var(--space-xl);
}

.skeleton-card {
  display: flex;
  flex-direction: column;
}
</style>