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
defineEmits(['click']);
</script>

<template>
  <div class="model-card card card-clickable" @click="$emit('click')">
    <div class="model-thumbnail">
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="title"
        class="img-cover"
      />
      <div v-else class="placeholder-thumbnail">
        <span>No Image</span>
      </div>

      <!-- Liked Indicator -->
      <div v-if="isLiked" class="liked-indicator">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </div>
      
      <!-- Hover Overlay -->
      <div class="content-overlay">
        <div class="overlay-top">
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

        <div class="overlay-bottom">
          <h3 class="model-title text-lg font-semibold truncate">{{ title }}</h3>
          <p v-if="description" class="model-description text-sm line-clamp-2">
            {{ description }}
          </p>
          <div class="model-tags-footer">
            <div v-if="tags && tags.length" class="model-tags flex flex-wrap gap-xs">
              <span v-for="tag in tags.slice(0, 3)" :key="tag.id" class="badge badge-overlay text-xs">
                {{ tag.name }}
              </span>
              <span v-if="tags.length > 3" class="badge badge-overlay text-xs">
                +{{ tags.length - 3 }}
              </span>
            </div>
            <div class="model-footer">
              <span class="text-sm">by {{ userNickname }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.model-card {
  overflow: hidden;
  padding: 0;
  height: auto;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-lg); /* Ensure card has rounding */
}

.model-thumbnail {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-hover);
}

.placeholder-thumbnail {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-hover);
  color: var(--text-muted);
  font-size: 14px;
}

.model-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.model-card:hover .model-thumbnail img {
  transform: scale(1.05);
}

.liked-indicator {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  color: #ff4757;
  z-index: 1;
}

.content-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--space-sm); /* Reduced padding */
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.2) 40%, rgba(0, 0, 0, 0.8) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  color: white;
  z-index: 2;
}

.model-card:hover .content-overlay {
  opacity: 1;
}

.overlay-top {
  display: flex;
  gap: var(--space-sm);
}

.overlay-bottom {
  display: flex;
  flex-direction: column;
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: var(--radius-md);
  color: white;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(4px);
}

.stat-liked {
  color: #ff4757;
}

.model-title {
  margin-bottom: var(--space-xs);
  color: white;
}

.model-description {
  color: #e0e0e0;
  margin-bottom: var(--space-sm);
}

.model-tags-footer {
  margin-top: auto; /* Push to bottom */
}

.model-tags {
  margin-bottom: var(--space-sm);
}

.badge-overlay {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.model-footer {
  color: #e0e0e0;
}
</style>
