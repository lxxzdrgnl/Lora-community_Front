<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import ModelCard from '../components/ModelCard.vue';
import ModelDetailModal from '../components/ModelDetailModal.vue';
import { api, authStore, type UserResponse, type LoraModel } from '../services/api';

const router = useRouter();
const route = useRoute();

const user = ref<UserResponse | null>(null);
const isEditing = ref(false);
const editForm = ref({
  nickname: '',
  profileImageUrl: '',
});

const showDetailModal = ref(false);
const selectedModelId = ref<number | null>(null);

const openModelDetail = (modelId: number) => {
  selectedModelId.value = modelId;
  showDetailModal.value = true;
};

const closeModelDetail = () => {
  showDetailModal.value = false;
  selectedModelId.value = null;
};

const refreshAllModels = () => {
  loadMyModels();
  loadFavoriteModels();
  loadLikedModels();
};

// Set initial tab based on route
const getInitialTab = () => {
  if (route.path === '/my-models') return 'models';
  if (route.path === '/favorites') return 'favorites';
  return 'models'; // default to models for /profile
};

const activeTab = ref<'models' | 'favorites' | 'history'>(getInitialTab());
const loading = ref(true);
const myModels = ref<LoraModel[]>([]);
const favoriteModels = ref<LoraModel[]>([]);
const likedModels = ref<LoraModel[]>([]);
const generationHistory = ref<any[]>([]);

onMounted(async () => {
  // Check if user is logged in
  if (!authStore.isAuthenticated()) {
    router.push('/login');
    return;
  }

  await loadUserProfile();
  await loadMyModels();
  await loadFavoriteModels();
  await loadLikedModels();
  await loadGenerationHistory();
});

const loadUserProfile = async () => {
  try {
    const response = await api.user.getMyProfile();
    user.value = response.data;
    editForm.value = {
      nickname: user.value.nickname,
      profileImageUrl: user.value.profileImageUrl || '',
    };
  } catch (error) {
    console.error('Failed to load user profile:', error);
    // Token might be expired
    authStore.clearTokens();
    router.push('/login');
  }
};

const loadMyModels = async () => {
  try {
    const response = await api.models.getMyModels(0, 20);
    myModels.value = response.data.content;
  } catch (error) {
    console.error('Failed to load my models:', error);
  }
};

const loadFavoriteModels = async () => {
  try {
    const response = await api.community.getFavoriteModels(0, 20);
    favoriteModels.value = response.data.content;
  } catch (error) {
    console.error('Failed to load favorite models:', error);
  }
};

const loadLikedModels = async () => {
  try {
    const response = await api.community.getLikedModels(0, 20);
    likedModels.value = response.data.content;
  } catch (error) {
    console.error('Failed to load liked models:', error);
  } finally {
    loading.value = false;
  }
};

const loadGenerationHistory = async () => {
  try {
    const response = await api.generation.getMyGenerationHistory(0, 20);
    generationHistory.value = response.data.content;
  } catch (error) {
    console.error('Failed to load generation history:', error);
  }
};

const startEdit = () => {
  isEditing.value = true;
};

const cancelEdit = () => {
  isEditing.value = false;
  if (user.value) {
    editForm.value = {
      nickname: user.value.nickname,
      profileImageUrl: user.value.profileImageUrl || '',
    };
  }
};

const saveProfile = async () => {
  try {
    const response = await api.user.updateMyProfile({
      nickname: editForm.value.nickname,
      profileImageUrl: editForm.value.profileImageUrl || undefined,
    });
    user.value = response.data;
    isEditing.value = false;

    // Dispatch custom event to update Navigation
    window.dispatchEvent(new CustomEvent('profile-updated', {
      detail: response.data
    }));
  } catch (error) {
    console.error('Failed to update profile:', error);
    alert('Failed to update profile. Please try again.');
  }
};
</script>

<template>
  <div class="container">
    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center" style="min-height: 60vh;">
      <div class="loading"></div>
      <p class="text-lg text-secondary mt-lg">Loading profile...</p>
    </div>

    <!-- Profile Content -->
    <div v-else-if="user">
      <!-- Profile Header Card -->
      <div class="card mb-xl">
        <div class="flex items-start gap-lg flex-col-mobile">
          <!-- Avatar -->
          <img
            :src="user.profileImageUrl || 'https://via.placeholder.com/120'"
            alt="Profile"
            class="profile-avatar rounded-full"
            style="border: 3px solid var(--border);"
          />

          <!-- User Info -->
          <div style="flex: 1;">
            <template v-if="!isEditing">
              <h1 class="text-3xl font-bold mb-sm">{{ user.nickname }}</h1>
              <p class="text-secondary mb-md">{{ user.email }}</p>
              <p class="text-sm text-muted mb-md">Member since {{ new Date(user.createdAt).toLocaleDateString() }}</p>

              <!-- Stats -->
              <div class="flex gap-lg">
                <div class="stat-item">
                  <span class="stat-value">{{ myModels.length }}</span>
                  <span class="stat-label">Models</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ likedModels.length + favoriteModels.length }}</span>
                  <span class="stat-label">Favorites</span>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="form-group">
                <label class="label">Nickname</label>
                <input v-model="editForm.nickname" type="text" class="input" />
              </div>
              <div class="form-group">
                <label class="label">Profile Image URL</label>
                <input v-model="editForm.profileImageUrl" type="text" class="input" />
              </div>
            </template>
          </div>

          <!-- Actions -->
          <div class="flex gap-sm">
            <button v-if="!isEditing" class="btn btn-primary" @click="startEdit">
              Edit Profile
            </button>
            <template v-else>
              <button class="btn btn-secondary" @click="cancelEdit">Cancel</button>
              <button class="btn btn-primary" @click="saveProfile">Save</button>
            </template>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-container mb-lg">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'models' }"
          @click="activeTab = 'models'"
        >
          My Models
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'favorites' }"
          @click="activeTab = 'favorites'"
        >
          Favorites
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'history' }"
          @click="activeTab = 'history'"
        >
          Generation History
        </button>
      </div>

      <!-- Tab Content -->
      <div>
        <!-- My Models Tab -->
        <div v-if="activeTab === 'models'">
          <h2 class="text-2xl font-bold mb-lg">내 모델</h2>
          <div v-if="myModels.length" class="grid grid-cols-4 gap-lg">
            <div
              v-for="model in myModels"
              :key="model.id"
              @click="openModelDetail(model.id)"
              class="cursor-pointer"
            >
              <ModelCard
                :id="model.id"
                :title="model.title"
                :description="model.description"
                :thumbnailUrl="model.thumbnailUrl"
                :userNickname="model.userNickname"
                :likeCount="model.likeCount"
                :viewCount="model.viewCount"
                :favoriteCount="model.favoriteCount"
              />
            </div>
          </div>
          <div v-else class="card text-center p-xl">
            <p class="text-secondary text-lg mb-md">You haven't created any models yet</p>
            <a href="/training" class="btn btn-primary">Create Your First Model</a>
          </div>
        </div>

        <!-- Favorites Tab -->
        <div v-if="activeTab === 'favorites'">
          <!-- Liked Models Section -->
          <div v-if="likedModels.length > 0" class="mb-xl">
            <h2 class="text-2xl font-bold mb-lg">좋아요한 모델</h2>
            <div class="grid grid-cols-4 gap-lg">
              <div
                v-for="model in likedModels"
                :key="model.id"
                @click="openModelDetail(model.id)"
                class="cursor-pointer"
              >
                <ModelCard
                  :id="model.id"
                  :title="model.title"
                  :description="model.description"
                  :thumbnailUrl="model.thumbnailUrl"
                  :userNickname="model.userNickname"
                  :likeCount="model.likeCount"
                  :viewCount="model.viewCount"
                  :favoriteCount="model.favoriteCount"
                />
              </div>
            </div>
          </div>

          <!-- Favorited Models Section -->
          <div v-if="favoriteModels.length > 0">
            <h2 class="text-2xl font-bold mb-lg">즐겨찾기한 모델</h2>
            <div class="grid grid-cols-4 gap-lg">
              <div
                v-for="model in favoriteModels"
                :key="model.id"
                @click="openModelDetail(model.id)"
                class="cursor-pointer"
              >
                <ModelCard
                  :id="model.id"
                  :title="model.title"
                  :description="model.description"
                  :thumbnailUrl="model.thumbnailUrl"
                  :userNickname="model.userNickname"
                  :likeCount="model.likeCount"
                  :viewCount="model.viewCount"
                  :favoriteCount="model.favoriteCount"
                />
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="likedModels.length === 0 && favoriteModels.length === 0" class="card text-center p-xl">
            <p class="text-secondary text-lg">좋아요하거나 즐겨찾기한 모델이 없습니다</p>
          </div>
        </div>

        <!-- Generation History Tab -->
        <div v-if="activeTab === 'history'">
          <div v-if="generationHistory.length" class="grid grid-cols-4 gap-lg">
            <div v-for="item in generationHistory" :key="item.id" class="card p-0 overflow-hidden">
              <img
                v-if="item.imageUrl"
                :src="item.imageUrl"
                alt="Generated"
                class="w-full"
                style="aspect-ratio: 1; object-fit: cover;"
              />
              <div class="p-md">
                <p class="text-sm text-muted mb-xs">{{ new Date(item.createdAt).toLocaleString() }}</p>
                <p class="text-sm truncate">{{ item.prompt }}</p>
              </div>
            </div>
          </div>
          <div v-else class="card text-center p-xl">
            <p class="text-secondary text-lg">No generation history yet</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  <ModelDetailModal 
    :show="showDetailModal" 
    :model-id="selectedModelId" 
    @close="closeModelDetail"
    @model-update="refreshAllModels" 
  />
</template>

<style scoped>
/* Profile-specific styles using main.css classes */
.profile-avatar {
  width: 120px;
  height: 120px;
}

.tabs-container {
  display: flex;
  gap: var(--space-sm);
  border-bottom: 2px solid var(--border);
}

.tab-btn {
  padding: var(--space-md) var(--space-lg);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--text-primary);
  border-bottom-color: var(--primary);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .tabs-container {
    overflow-x: auto;
  }

  .tab-btn {
    white-space: nowrap;
  }
}
</style>
