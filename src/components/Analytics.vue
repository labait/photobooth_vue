<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { isAnalyticsEnabled, trackPageView } from '../analytics'

const route = useRoute()

if (isAnalyticsEnabled()) {
  watch(
    () => route.fullPath,
    (path) => trackPageView(path),
    { immediate: true },
  )
}
</script>
