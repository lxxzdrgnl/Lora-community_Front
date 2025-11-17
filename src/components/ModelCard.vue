<script setup lang="ts">
interface Props {
  id: number;
  title: string;
  description?: string;
  userNickname: string;
  likeCount: number;
  viewCount: number;
  favoriteCount: number;
  isLiked?: boolean;
  thumbnailUrl?: string;
  tags?: Array<{ id: number; name: string }>;
}

defineProps<Props>();
</script>

<template>
  <div class="model-card card card-clickable">
    <!-- Thumbnail -->
    <div class="model-thumbnail">
      <img
        :src="thumbnailUrl || 'https://via.placeholder.com/400x300?text=No+Image'"
        :alt="title"
        class="img-cover"
      />
      <div class="model-overlay">
        <div class="flex gap-sm">
          <span class="stat" :class="{ 'stat-liked': isLiked }">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" :fill="isLiked ? 'currentColor' : 'none'" stroke="currentColor" :stroke-width="isLiked ? '0' : '2'">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            {{ likeCount }}
          </span>
          <span class="stat">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            {{ viewCount }}
          </span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="model-content">
      <h3 class="model-title text-lg font-semibold truncate">{{ title }}</h3>
      <p v-if="description" class="model-description text-sm text-secondary line-clamp-2">
        {{ description }}
      </p>

      <!-- Tags -->
      <div v-if="tags && tags.length" class="model-tags flex flex-wrap gap-xs mt-sm">
        <span v-for="tag in tags.slice(0, 3)" :key="tag.id" class="badge badge-secondary text-xs">
          {{ tag.name }}
        </span>
        <span v-if="tags.length > 3" class="badge badge-secondary text-xs">
          +{{ tags.length - 3 }}
        </span>
      </div>

      <!-- Footer -->
      <div class="model-footer flex items-center justify-between mt-md">
        <span class="text-sm text-secondary">by {{ userNickname }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.model-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.model-thumbnail {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--bg-hover);
}

.model-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
  border-radius: var(--radius-sm);
}

.model-card:hover .model-thumbnail img {
  transform: scale(1.05);
}

.model-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: var(--space-md);
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), transparent);
  border-top-left-radius: var(--radius-sm);
  border-top-right-radius: var(--radius-sm);
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: var(--radius-md);
  color: white;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(4px);
}

.stat-liked {
  color: #ff4757;
}

.model-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--space-md);
}

.model-title {
  margin-bottom: var(--space-xs);
}

.model-description {
  margin-bottom: var(--space-xs);
  flex: 1;
}

.model-tags {
  margin-top: auto;
}

.model-footer {
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border);
}
</style>
