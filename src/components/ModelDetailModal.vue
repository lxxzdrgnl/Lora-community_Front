<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { api, authStore } from '../services/api';
import ModelDetailSkeleton from './ModelDetailSkeleton.vue';

const props = defineProps<{
  show: boolean;
  modelId: number | null;
}>();

const emit = defineEmits(['close', 'open-generate', 'model-update']);

const loading = ref(true);
const error = ref('');
const isEditing = ref(false);
const currentUser = ref<any>(null);

const model = ref<any>(null);
const comments = ref<any[]>([]);

const newComment = ref('');
const availableTags = ref<any[]>([]);
const newTagInput = ref('');
const editingPromptId = ref<number | null>(null);
const newPrompt = ref({
  title: '',
  prompt: '',
  negativePrompt: '',
  description: ''
});

const isOwner = computed(() => {
  return currentUser.value && model.value && model.value.userId === currentUser.value.id;
});

watch(() => props.modelId, async (newId) => {
  if (newId) {
    await loadCurrentUser();
    await fetchModelDetails(newId);
    await fetchComments(newId);
  }
});

const loadCurrentUser = async () => {
  if (!authStore.isAuthenticated()) return;
  try {
    const response = await api.user.getMyProfile();
    currentUser.value = response.data;
  } catch (err) {
    console.error('Failed to load current user:', err);
  }
};

const fetchModelDetails = async (id: number) => {
  try {
    loading.value = true;
    const response = await api.models.getModelDetail(id);
    model.value = response.data;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load model';
  } finally {
    loading.value = false;
  }
};

const fetchComments = async (id: number) => {
  try {
    const response = await api.community.getComments(id, 0, 20);
    comments.value = response.data.content;
  } catch (err) {
    console.error('Failed to fetch comments:', err);
  }
};

const toggleLike = async () => {
  if (!props.modelId) return;
  try {
    await api.community.toggleLike(props.modelId);
    model.value.isLiked = !model.value.isLiked;
    model.value.likeCount += model.value.isLiked ? 1 : -1;
    emit('model-update');
  } catch (err) {
    console.error('Failed to toggle like:', err);
  }
};

const submitComment = async () => {
  if (!newComment.value.trim() || !props.modelId) return;
  try {
    const response = await api.community.createComment(props.modelId, newComment.value);
    comments.value.unshift(response.data);
    newComment.value = '';
  } catch (err) {
    console.error('Failed to create comment:', err);
  }
};

const toggleCommentLike = async (commentId: number) => {
  if (!props.modelId) return;
  try {
    const response = await api.community.toggleCommentLike(props.modelId, commentId);
    const comment = comments.value.find(c => c.id === commentId);
    if (comment) {
      comment.isLiked = response.data.isLiked;
      comment.likeCount += response.data.isLiked ? 1 : -1;
    }
  } catch (err) {
    console.error('Failed to toggle comment like:', err);
  }
};

const copyPrompt = (prompt: string) => {
  navigator.clipboard.writeText(prompt);
};

const openGenerateModal = () => {
  if (props.modelId) {
    emit('open-generate', props.modelId);
  }
};

const closeModal = () => {
  emit('close');
};

const resetNewPrompt = () => {
  newPrompt.value = {
    title: '',
    prompt: '',
    negativePrompt: '',
    description: ''
  };
};

const addNewPrompt = async () => {
  if (!newPrompt.value.title || !newPrompt.value.prompt || !props.modelId) return;
  try {
    await api.prompts.createPrompt(props.modelId, newPrompt.value);
    await fetchModelDetails(props.modelId);
    resetNewPrompt();
  } catch (err) {
    console.error('Failed to create prompt:', err);
  }
};

const startEditPrompt = (prompt: any) => {
  editingPromptId.value = prompt.id;
  newPrompt.value = { ...prompt };
};

const savePromptEdit = async (promptId: number) => {
  if (!props.modelId) return;
  try {
    await api.prompts.updatePrompt(props.modelId, promptId, newPrompt.value);
    await fetchModelDetails(props.modelId);
    editingPromptId.value = null;
    resetNewPrompt();
  } catch (err) {
    console.error('Failed to update prompt:', err);
  }
};

const deletePrompt = async (promptId: number) => {
  if (!props.modelId || !confirm('Are you sure you want to delete this prompt?')) return;
  try {
    await api.prompts.deletePrompt(props.modelId, promptId);
    await fetchModelDetails(props.modelId);
  } catch (err) {
    console.error('Failed to delete prompt:', err);
  }
};

const deleteComment = async (commentId: number) => {
  if (!props.modelId || !confirm('Are you sure you want to delete this comment?')) return;
  try {
    await api.community.deleteComment(props.modelId, commentId);
    comments.value = comments.value.filter(c => c.id !== commentId);
  } catch (err) {
    console.error('Failed to delete comment:', err);
  }
};
</script>

<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <button @click="closeModal" class="btn-close">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div class="modal-body-content hide-scrollbar">
        <ModelDetailSkeleton v-if="loading" />
        <div v-else-if="error" class="text-center p-xl text-error">{{ error }}</div>
        <div v-else-if="model" class="model-detail-page">
          <div class="independent-scroll-container">
            <div class="scrollable-column">
              <h1 class="text-4xl font-bold mb-md">{{ model.title }}</h1>

              <!-- Sample Images -->
              <section class="samples-section mb-lg">
                <div class="grid grid-cols-2 gap-lg hide-scrollbar">
                  <div v-for="sample in model.samples" :key="sample.id" class="sample-item">
                    <img :src="sample.imageUrl" alt="Sample" class="img-cover rounded-lg" />
                  </div>
                </div>
              </section>

              <!-- Model Info -->
              <div class="model-info mb-lg">
                <p class="text-lg text-secondary mb-md">{{ model.description }}</p>
                <div class="flex items-center gap-md mb-lg">
                  <p class="font-semibold">{{ model.userNickname }}</p>
                </div>
                <div class="flex flex-wrap gap-sm items-center mb-lg">
                  <span v-for="tag in model.tags" :key="tag.id" class="tag">{{ tag.name }}</span>
                </div>
                <div class="flex gap-sm">
                  <button class="btn btn-secondary btn-icon" @click="toggleLike" :class="{ 'btn-primary': model.isLiked }">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" :fill="model.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    {{ model.likeCount }}
                  </button>
                  <button class="btn btn-primary" @click="openGenerateModal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Generate with this model
                  </button>
                </div>
              </div>

              <!-- Prompts -->
              <section class="prompts-section mb-lg">
                <div class="flex items-center justify-between mb-lg">
                  <h2 class="text-2xl font-bold gradient-text">Prompt Examples</h2>
                  <button v-if="isOwner && editingPromptId === null" @click="editingPromptId = -1" class="btn btn-sm btn-primary">
                    Add New Prompt
                  </button>
                </div>

                <div v-if="editingPromptId !== null" class="card mb-lg">
                  <h3 class="font-semibold mb-md">{{ editingPromptId === -1 ? 'New Prompt' : 'Edit Prompt' }}</h3>
                  <div class="form-group mb-md">
                    <label class="label">Title</label>
                    <input v-model="newPrompt.title" type="text" class="input" placeholder="Prompt title" />
                  </div>
                  <div class="form-group mb-md">
                    <label class="label">Positive Prompt</label>
                    <textarea v-model="newPrompt.prompt" class="textarea" rows="3" placeholder="Positive prompt"></textarea>
                  </div>
                  <div class="form-group mb-md">
                    <label class="label">Negative Prompt</label>
                    <textarea v-model="newPrompt.negativePrompt" class="textarea" rows="3" placeholder="Negative prompt"></textarea>
                  </div>
                  <div class="form-group mb-md">
                    <label class="label">Description (optional)</label>
                    <input v-model="newPrompt.description" type="text" class="input" placeholder="Prompt description" />
                  </div>
                  <div class="flex gap-sm">
                    <button @click="editingPromptId === -1 ? addNewPrompt() : savePromptEdit(editingPromptId)" class="btn btn-primary">
                      {{ editingPromptId === -1 ? 'Add' : 'Save' }}
                    </button>
                    <button @click="editingPromptId = null; resetNewPrompt();" class="btn btn-secondary">
                      Cancel
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-lg">
                  <div v-for="prompt in model.prompts" :key="prompt.id" class="card">
                    <div class="flex items-center justify-between mb-md">
                      <h3 class="font-semibold">{{ prompt.title }}</h3>
                      <div v-if="isOwner" class="flex gap-sm">
                        <button @click="startEditPrompt(prompt)" class="btn btn-ghost btn-sm">Edit</button>
                        <button @click="deletePrompt(prompt.id)" class="btn btn-ghost btn-sm text-error">Delete</button>
                      </div>
                    </div>
                    <div class="prompt-box mb-md">
                      <div class="flex items-center justify-between mb-sm">
                        <span class="text-sm text-secondary">Positive Prompt</span>
                        <button class="btn btn-ghost btn-sm" @click="copyPrompt(prompt.prompt)">Copy</button>
                      </div>
                      <p class="prompt-text">{{ prompt.prompt }}</p>
                    </div>
                    <div class="prompt-box">
                      <div class="flex items-center justify-between mb-sm">
                        <span class="text-sm text-secondary">Negative Prompt</span>
                        <button class="btn btn-ghost btn-sm" @click="copyPrompt(prompt.negativePrompt)">Copy</button>
                      </div>
                      <p class="prompt-text">{{ prompt.negativePrompt }}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <!-- Comments -->
            <section class="comments-section scrollable-column">
              <h2 class="text-2xl font-bold mb-lg gradient-text">Comments</h2>
              <div class="card mb-lg">
                <textarea v-model="newComment" class="textarea mb-md" placeholder="Write a comment..." rows="3"></textarea>
                <button class="btn btn-primary" @click="submitComment">Post Comment</button>
              </div>
              <div class="comments-list flex flex-col gap-md">
                <div v-for="comment in comments" :key="comment.id" class="card-sm">
                  <div class="flex items-start gap-md">
                    <img :src="comment.userProfileImageUrl || 'https://via.placeholder.com/40'" alt="User" class="avatar" />
                    <div class="flex-1">
                      <div class="flex items-center justify-between mb-xs">
                        <div class="flex items-center gap-sm">
                          <span class="font-semibold">{{ comment.userNickname }}</span>
                          <span class="text-xs text-muted">{{ new Date(comment.createdAt).toLocaleDateString() }}</span>
                        </div>
                        <button v-if="currentUser && comment.userNickname === currentUser.nickname" @click="deleteComment(comment.id)" class="btn btn-ghost btn-sm text-error">Delete</button>
                      </div>
                      <div class="flex items-start justify-between">
                        <p class="text-secondary mb-sm flex-1">{{ comment.content }}</p>
                        <button
                          class="btn btn-ghost btn-sm"
                          :class="{ 'text-error': comment.isLiked }"
                          @click="toggleCommentLike(comment.id)"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" :fill="comment.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                          </svg>
                          {{ comment.likeCount }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
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
  z-index: 1010;
  padding: var(--space-lg);
}

.modal-content {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  position: relative;
}

.modal-body-content {
  padding: var(--space-lg);
  overflow-y: auto;
}

.independent-scroll-container {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-lg);
}

.scrollable-column {
  padding-right: var(--space-md);
}

.sample-item {
  aspect-ratio: 0.8;
  overflow: hidden; /* Ensure content doesn't overflow during scale */
}

.sample-item img {
  transition: transform 0.3s ease, filter 0.3s ease; /* Add transition for smooth effect */
}

.sample-item img:hover {
  transform: scale(1.05); /* Slightly scale up */
  filter: brightness(1.1); /* Slightly brighten */
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: var(--space-xs); /* Reduce outer padding on mobile */
  }
  .modal-body-content {
    padding: var(--space-md);
  }
  .independent-scroll-container {
    grid-template-columns: 1fr;
  }
  /* Change image grid to a horizontal scroll container on mobile */
  .samples-section .grid-cols-3 {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    gap: var(--space-md);
  }

  .samples-section .sample-item {
    flex: 0 0 70%;
    max-width: 280px;
    scroll-snap-align: start;
  }

  .btn-icon {
    padding: 8px; /* Smaller padding for icon buttons on mobile */
  }
}

.btn-close {
  position: absolute;
  top: var(--space-lg);
  right: var(--space-lg);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: var(--space-sm);
  z-index: 10;
  transition: color 0.2s ease;
}
.btn-close:hover {
  color: var(--text-primary);
}
</style>