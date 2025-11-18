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
  <div class="model-list-page">
    <!-- Hero Section -->
    <section class="hero text-center py-lg">
      <h1 class="text-4xl font-bold gradient-text mb-md">
        Explore LoRA Models
      </h1>
      <p class="text-lg text-secondary mb-lg">
        Discover and share amazing AI models created by the community
      </p>

      <!-- Search Bar -->
      <div class="search-container" style="max-width: 600px; margin: 0 auto;">
        <div class="flex gap-sm">
          <input
            v-model="searchQuery"
            type="text"
            class="input flex-1"
            placeholder="Search models by title, description, or character..."
            @keyup.enter="handleSearch"
          />
          <button class="btn btn-primary" @click="handleSearch">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            Search
          </button>
          <button v-if="searchQuery" class="btn btn-secondary" @click="clearSearch">
            Clear
          </button>
        </div>
      </div>
    </section>

    <!-- Search Results Info -->
    <div v-if="searchQuery" class="card mb-lg p-md text-center">
      <p class="text-secondary">
        Search results for "<span class="text-primary font-semibold">{{ searchQuery }}</span>"
        <button class="btn btn-sm btn-secondary ml-sm" @click="clearSearch">Clear</button>
      </p>
    </div>

    <!-- Filters -->
    <section class="filters mb-xl">
      <div class="flex items-center justify-between mb-lg flex-wrap gap-md">
        <!-- Tabs -->
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

        <!-- Generate Button -->
        <button @click="openGenerateModal(null)" class="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Generate
        </button>
      </div>

      <!-- Tags Filter -->
      <div v-if="popularTags.length" class="tags-filter">
        <h3 class="text-sm text-secondary mb-sm">Filter by tags:</h3>
        <div class="flex flex-wrap gap-sm">
          <button
            v-for="tag in popularTags"
            :key="tag.id"
            class="tag"
            :class="{ active: selectedTags.includes(tag.name) }"
            @click="toggleTag(tag.name)"
          >
            {{ tag.name }}
            <span class="badge badge-secondary text-xs ml-xs">{{ tag.usageCount }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Error State -->
    <div v-if="error" class="card mb-lg p-lg text-center">
      <p class="text-error mb-md">{{ error }}</p>
      <button class="btn btn-secondary" @click="fetchModels">Retry</button>
    </div>

    <!-- Models Grid -->
    <section class="models-grid">
      <!-- Loading -->
      <div v-if="loading" class="grid grid-cols-4 gap-lg">
        <div v-for="i in 8" :key="i" class="skeleton-card">
          <div class="skeleton" style="aspect-ratio: 4/3; border-radius: var(--radius-lg);"></div>
          <div class="skeleton mt-md" style="height: 24px; width: 80%;"></div>
          <div class="skeleton mt-sm" style="height: 16px; width: 60%;"></div>
        </div>
      </div>

      <!-- Models -->
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

      <!-- Empty State -->
      <div v-else class="empty-state card text-center py-xl">
        <p class="text-secondary text-lg">No models found</p>
        <p v-if="selectedTags.length" class="text-muted mt-sm">
          Try removing some filters
        </p>
      </div>
    </section>

    <!-- Pagination -->
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
.model-list-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg);
}

.hero {
  margin-bottom: var(--space-2xl);
}

.skeleton-card {
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .tabs-group {
    width: 100%;
  }

  .tabs-group .btn {
    flex: 1;
  }

  .search-container .flex {
    flex-direction: column;
  }

  .search-container .btn {
    width: 100%;
  }
}
</style>
