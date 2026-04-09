import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Typography } from '@/constants/theme';
import { useAppSettings } from '@/providers/app-settings-provider';
import { useInventory } from '@/providers/inventory-provider';
import { useAppTheme } from '@/providers/theme-provider';
import { buildRecipeSuggestions } from '@/utils/recipes';

export default function RecipeDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const recipeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { palette } = useAppTheme();
  const { products } = useInventory();
  const { expiringSoonDays } = useAppSettings();
  const [isPreparationStarted, setIsPreparationStarted] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const recipe = useMemo(() => {
    const recipes = buildRecipeSuggestions(products, { expiringSoonDays });
    return recipes.find((candidate) => candidate.id === recipeId);
  }, [expiringSoonDays, products, recipeId]);

  const steps = recipe?.steps ?? [];
  const completedCount = completedSteps.length;
  const progressPercent = steps.length === 0 ? 0 : Math.round((completedCount / steps.length) * 100);

  useEffect(() => {
    setIsPreparationStarted(false);
    setCompletedSteps([]);
  }, [recipe?.id]);

  const onBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/recipes');
  };

  const onStartCooking = async () => {
    setIsPreparationStarted(true);
    setCompletedSteps([]);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const onResetPreparation = async () => {
    setCompletedSteps([]);
    await Haptics.selectionAsync();
  };

  const toggleStep = async (index: number) => {
    if (!isPreparationStarted) {
      return;
    }

    setCompletedSteps((current) => {
      if (current.includes(index)) {
        return current.filter((value) => value !== index);
      }

      return [...current, index].sort((a, b) => a - b);
    });
    await Haptics.selectionAsync();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: pressed ? palette.surfacePressed : palette.surface },
          ]}>
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Detail recette</Text>

        <View style={styles.iconButton} />
      </View>

      {!recipe ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.card, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
            <IconSymbol name="fork.knife" size={28} color={palette.textTertiary} />
            <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Recette introuvable</Text>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
              Reviens a l ecran precedent pour regenerer les suggestions.
            </Text>
            <Pressable
              onPress={() => router.replace('/recipes')}
              style={({ pressed }) => [
                styles.ctaButton,
                { backgroundColor: pressed ? palette.accentPrimaryStrong : palette.accentPrimary },
              ]}>
              <Text style={[Typography.labelLg, { color: palette.textInverse }]}>Retour recettes</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.heroCard, { backgroundColor: palette.accentPrimary }]}>
            <IconSymbol name="fork.knife" size={32} color={palette.textInverse} />
            <View style={styles.heroTextWrap}>
              <Text style={[Typography.titleMd, { color: palette.textInverse }]}>{recipe.title}</Text>
              <View style={styles.timeRow}>
                <IconSymbol name="clock" size={13} color={palette.textInverse + 'CC'} />
                <Text style={[Typography.labelSm, { color: palette.textInverse + 'CC' }]}>
                  Temps estime: {recipe.time}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
            <View style={styles.sectionTitle}>
              <View style={[styles.sectionDot, { backgroundColor: palette.accentPrimary }]} />
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Ingredients</Text>
            </View>
            <View style={styles.listWrap}>
              {recipe.ingredients.map((ingredient, index) => (
                <View key={`${recipe.id}-ingredient-${index}`} style={[styles.ingredientRow, { backgroundColor: palette.glowSecondary }]}>
                  <View style={[styles.bulletDot, { backgroundColor: palette.accentPrimary }]} />
                  <Text style={[Typography.bodyMd, { color: palette.textPrimary }]}>{ingredient}</Text>
                </View>
              ))}
            </View>
          </View>

          {isPreparationStarted ? (
            <View style={[styles.card, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
              <View style={styles.sectionTitle}>
                <View style={[styles.sectionDot, { backgroundColor: palette.success }]} />
                <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Preparation en cours</Text>
              </View>

              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                {completedCount}/{steps.length} etape{steps.length > 1 ? 's' : ''} validee{completedCount > 1 ? 's' : ''}
              </Text>

              <View style={[styles.progressTrack, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: progressPercent === 100 ? palette.success : palette.accentPrimary,
                    },
                  ]}
                />
              </View>

              {progressPercent === 100 ? (
                <Text style={[Typography.bodySm, { color: palette.success }]}>
                  Toutes les etapes sont pretes. Tu peux passer en cuisine.
                </Text>
              ) : (
                <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                  Touche une etape pour la marquer comme faite.
                </Text>
              )}

              <Pressable
                onPress={() => {
                  void onResetPreparation();
                }}
                style={({ pressed }) => [
                  styles.resetButton,
                  { backgroundColor: pressed ? palette.surfacePressed : palette.surfaceSoft },
                ]}>
                <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Reinitialiser les etapes</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={[styles.card, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
            <View style={styles.sectionTitle}>
              <View style={[styles.sectionDot, { backgroundColor: palette.warning }]} />
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Etapes recommandees</Text>
            </View>
            <View style={styles.listWrap}>
              {steps.map((step, index) => {
                const isCompleted = completedSteps.includes(index);
                const stepContent = (
                  <View style={styles.stepRow}>
                    <View
                      style={[
                        styles.stepIndex,
                        {
                          backgroundColor: isCompleted
                            ? palette.success
                            : isPreparationStarted
                              ? palette.accentPrimary
                              : palette.overlay,
                        },
                      ]}>
                      {isCompleted ? (
                        <IconSymbol name="checkmark" size={12} color={palette.textInverse} />
                      ) : (
                        <Text
                          style={[
                            Typography.labelSm,
                            {
                              color: isPreparationStarted ? palette.textInverse : palette.accentPrimary,
                            },
                          ]}>
                          {index + 1}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        Typography.bodySm,
                        {
                          color: palette.textPrimary,
                          flex: 1,
                          textDecorationLine: isCompleted ? 'line-through' : 'none',
                        },
                      ]}>
                      {step}
                    </Text>
                  </View>
                );

                if (!isPreparationStarted) {
                  return <View key={`${recipe.id}-step-${index}`}>{stepContent}</View>;
                }

                return (
                  <Pressable
                    key={`${recipe.id}-step-${index}`}
                    onPress={() => {
                      void toggleStep(index);
                    }}
                    style={({ pressed }) => [
                      styles.stepPressable,
                      { backgroundColor: pressed ? palette.surfacePressed : 'transparent' },
                    ]}>
                    {stepContent}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {!isPreparationStarted ? (
            <Pressable
              onPress={() => {
                void onStartCooking();
              }}
              style={({ pressed }) => [
                styles.ctaButton,
                { backgroundColor: pressed ? palette.accentPrimaryStrong : palette.accentPrimary },
              ]}>
              <IconSymbol name="flame.fill" size={17} color={palette.textInverse} />
              <Text style={[Typography.labelLg, { color: palette.textInverse }]}>Demarrer la preparation</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  heroCard: {
    borderRadius: Radii.card,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroTextWrap: {
    flex: 1,
    gap: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  card: {
    borderRadius: Radii.card,
    padding: 18,
    gap: 12,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 3,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listWrap: {
    gap: 8,
  },
  ingredientRow: {
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    minWidth: 2,
  },
  resetButton: {
    height: 42,
    borderRadius: Radii.capsule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPressable: {
    borderRadius: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 2,
  },
  stepIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  ctaButton: {
    height: 52,
    borderRadius: Radii.capsule,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 5,
  },
  emptyWrap: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
});
