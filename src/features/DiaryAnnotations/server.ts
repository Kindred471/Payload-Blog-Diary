import { createServerFeature } from '@payloadcms/richtext-lexical'

export const DiaryAnnotationsFeature = createServerFeature({
  key: 'diaryAnnotations',
  feature: {
    ClientFeature: '@/features/DiaryAnnotations/client#DiaryAnnotationsFeatureClient',
  },
})
