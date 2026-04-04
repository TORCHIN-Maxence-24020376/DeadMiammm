import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/constants/theme';
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
      `Prépare ${main ?? 'l’ingrédient principal'} en portions régulières.`,
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
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable onPress={onBack} style={[styles.iconButton, { backgroundColor: palette.surfaceSoft }]}>
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Détail recette</Text>

        <View style={styles.iconButton} />
      </View>

      {!recipe ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Recette introuvable</Text>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
              Reviens à l’écran précédent pour régénérer les suggestions.
            </Text>
            <Pressable onPress={() => router.replace('/recipes')} style={[styles.ctaButton, { backgroundColor: palette.accentPrimary }]}>
              <Text style={[Typography.labelLg, { color: palette.textInverse }]}>Retour recettes</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>{recipe.title}</Text>
            <Text style={[Typography.labelMd, { color: palette.accentPrimary }]}>Temps estimé: {recipe.time}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Ingrédients</Text>
            <View style={styles.listWrap}>
              {recipe.ingredients.map((ingredient, index) => (
                <View key={`${recipe.id}-ingredient-${index}`} style={styles.row}>
                  <IconSymbol name="circle" size={8} color={palette.textSecondary} />
                  <Text style={[Typography.bodyMd, { color: palette.textPrimary }]}>{ingredient}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Étapes recommandées</Text>
            <View style={styles.listWrap}>
              {steps.map((step, index) => (
                <View key={`${recipe.id}-step-${index}`} style={styles.stepRow}>
                  <View style={[styles.stepIndex, { backgroundColor: palette.overlay }]}>
                    <Text style={[Typography.labelSm, { color: palette.accentPrimary }]}>{index + 1}</Text>
                  </View>
                  <Text style={[Typography.bodySm, { color: palette.textPrimary }]}>{step}</Text>
                </View>
              ))}
            </View>
          </View>

          <Pressable onPress={onStartCooking} style={[styles.ctaButton, { backgroundColor: palette.accentPrimary }]}>
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
    height: 60,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  listWrap: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  ctaButton: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
});
