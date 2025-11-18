<template>
  <div class="model-detail-page">
    <div class="independent-scroll-container">
      <div class="col-span-2 scrollable-column hide-scrollbar">
        <div class="skeleton-box h-12 w-3-of-4 mb-md"></div>

        <!-- Sample Images Skeleton -->
        <section class="samples-section mb-xl">
          <div class="grid grid-cols-3 gap-lg">
            <div v-for="i in 6" :key="i" class="sample-item skeleton-box"></div>
          </div>
        </section>

        <!-- Model Info Skeleton -->
        <div class="model-info mb-xl">
          <div class="skeleton-box h-6 w-full mb-md"></div>
          <div class="skeleton-box h-6 w-1-of-2 mb-lg"></div>
          <div class="flex items-center gap-md mb-lg">
            <div class="skeleton-box h-8 w-24"></div>
          </div>
          <div class="flex flex-wrap gap-sm items-center mb-lg">
            <div class="skeleton-box h-6 w-16"></div>
            <div class="skeleton-box h-6 w-20"></div>
            <div class="skeleton-box h-6 w-12"></div>
          </div>
          <div class="flex gap-sm">
            <div class="skeleton-box h-10 w-24"></div>
            <div class="skeleton-box h-10 w-48"></div>
          </div>
        </div>

        <!-- Prompts Skeleton -->
        <section class="prompts-section mb-xl">
          <div class="skeleton-box h-8 w-1-of-2 mb-lg"></div>
          <div class="card">
            <div class="skeleton-box h-6 w-1-of-4 mb-md"></div>
            <div class="skeleton-box h-16 w-full"></div>
          </div>
        </section>
      </div>

      <!-- Comments Skeleton -->
      <section class="comments-section scrollable-column hide-scrollbar">
        <div class="skeleton-box h-8 w-1-of-2 mb-lg"></div>
        <div class="card mb-lg">
          <div class="skeleton-box h-20 w-full mb-md"></div>
          <div class="skeleton-box h-10 w-32"></div>
        </div>
        <div class="comments-list flex flex-col gap-md">
          <div v-for="i in 3" :key="i" class="card-sm">
            <div class="flex items-start gap-md">
              <div class="skeleton-box avatar"></div>
              <div class="flex-1">
                <div class="skeleton-box h-5 w-1-of-3 mb-xs"></div>
                <div class="skeleton-box h-12 w-full mb-sm"></div>
                <div class="skeleton-box h-8 w-16"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.skeleton-box {
  background-color: var(--bg-hover);
  border-radius: var(--radius-md);
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.h-5 { height: 1.25rem; }
.h-6 { height: 1.5rem; }
.h-8 { height: 2rem; }
.h-10 { height: 2.5rem; }
.h-12 { height: 3rem; }
.h-16 { height: 4rem; }
.h-20 { height: 5rem; }
.w-full { width: 100%; }
.w-12 { width: 3rem; }
.w-16 { width: 4rem; }
.w-20 { width: 5rem; }
.w-24 { width: 6rem; }
.w-32 { width: 8rem; }
.w-48 { width: 12rem; }

.mb-xs { margin-bottom: var(--space-xs); }
.mb-sm { margin-bottom: var(--space-sm); }
.mb-md { margin-bottom: var(--space-md); }
.mb-lg { margin-bottom: var(--space-lg); }
.mb-xl { margin-bottom: var(--space-xl); }

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.sample-item {
  aspect-ratio: 0.8;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>