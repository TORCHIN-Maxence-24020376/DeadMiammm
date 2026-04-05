import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

  const recipe = useMemo(() => {
    const recipes = buildRecipeSuggestions(products, { expiringSoonDays });
    return recipes.find((candidate) => candidate.id === recipeId);
  }, [expiringSoonDays, products, recipeId]);

  const steps = useMemo(() => {
    if (!recipe) {
      return [];
    }

    const [main, second, third] = recipe.ingredients;

    return [
      `Prépare ${main ?? "l'ingrédient principal"} en portions régulières.`,
      `Mélange avec ${second ?? 'un accompagnement'} puis assaisonne selon ton goût.`,
      `Termine avec ${third ?? 'une touche finale'} et cuis/chauffe 8 à 12 minutes.`,
    ];
  }, [recipe]);

  const onBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/recipes');
  };

  const onStartCooking = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Recette lancée', 'Tu peux maintenant suivre les étapes et cuisiner.');
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

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Détail recette</Text>

        <View style={styles.iconButton} />
      </View>

      {!recipe ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.card, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
            <IconSymbol name="fork.knife" size={28} color={palette.textTertiary} />
            <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Recette introuvable</Text>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
              Reviens à l'écran précédent pour régénérer les suggestions.
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
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[Typography.titleMd, { color: palette.textInverse }]}>{recipe.title}</Text>
              <View style={[styles.timeRow]}>
                <IconSymbol name="clock" size={13} color={palette.textInverse + 'CC'} />
                <Text style={[Typography.labelSm, { color: palette.textInverse + 'CC' }]}>
                  Temps estimé: {recipe.time}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
            <View style={styles.sectionTitle}>
              <View style={[styles.sectionDot, { backgroundColor: palette.accentPrimary }]} />
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Ingrédients</Text>
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

          <View style={[styles.card, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
            <View style={styles.sectionTitle}>
              <View style={[styles.sectionDot, { backgroundColor: palette.warning }]} />
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Étapes recommandées</Text>
            </View>
            <View style={styles.listWrap}>
              {steps.map((step, index) => (
                <View key={`${recipe.id}-step-${index}`} style={styles.stepRow}>
                  <View style={[styles.stepIndex, { backgroundColor: palette.accentPrimary }]}>
                    <Text style={[Typography.labelSm, { color: palette.textInverse }]}>{index + 1}</Text>
                  </View>
                  <Text style={[Typography.bodySm, { color: palette.textPrimary, flex: 1 }]}>{step}</Text>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            onPress={onStartCooking}
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: pressed ? palette.accentPrimaryStrong : palette.accentPrimary },
            ]}>
            <IconSymbol name="flame.fill" size={17} color={palette.textInverse} />
            <Text style={[Typography.labelLg, { color: palette.textInverse }]}>Démarrer la préparation</Text>
          </Pressable>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
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
