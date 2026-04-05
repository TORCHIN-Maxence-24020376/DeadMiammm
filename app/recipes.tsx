import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Typography } from '@/constants/theme';
import { useAppSettings } from '@/providers/app-settings-provider';
import { useInventory } from '@/providers/inventory-provider';
import { useAppTheme } from '@/providers/theme-provider';
import { buildRecipeSuggestions } from '@/utils/recipes';

const RECIPE_COLORS = ['#16A34A', '#D97706', '#8B5CF6', '#0284C7'];

export default function RecipesScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { products } = useInventory();
  const { expiringSoonDays } = useAppSettings();

  const recipes = buildRecipeSuggestions(products, { expiringSoonDays });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: pressed ? palette.surfacePressed : palette.surface },
          ]}>
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Recettes suggérées</Text>

        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {recipes.map((recipe, recipeIndex) => {
          const accentColor = RECIPE_COLORS[recipeIndex % RECIPE_COLORS.length];
          return (
            <View
              key={`${recipe.id}-${recipeIndex}`}
              style={[styles.card, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
              <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />

              <View style={styles.cardInner}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleWrap}>
                    <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>{recipe.title}</Text>
                    <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                      Basé sur les produits à moins de {expiringSoonDays} jour{expiringSoonDays > 1 ? 's' : ''}.
                    </Text>
                  </View>
                  <View style={[styles.timeChip, { backgroundColor: accentColor + '18' }]}>
                    <IconSymbol name="clock" size={12} color={accentColor} />
                    <Text style={[Typography.labelSm, { color: accentColor }]}>{recipe.time}</Text>
                  </View>
                </View>

                <View style={styles.ingredientsWrap}>
                  {recipe.ingredients.map((ingredient, ingredientIndex) => (
                    <View
                      key={`${recipe.id}-${ingredientIndex}`}
                      style={[styles.ingredientPill, { backgroundColor: accentColor + '14' }]}>
                      <Text style={[Typography.caption, { color: accentColor }]}>{ingredient}</Text>
                    </View>
                  ))}
                </View>

                <Pressable
                  onPress={() => router.push(`/recipe/${recipe.id}`)}
                  style={({ pressed }) => [
                    styles.ctaButton,
                    { backgroundColor: pressed ? accentColor + 'DD' : accentColor },
                  ]}>
                  <Text style={[Typography.labelLg, { color: palette.textInverse }]}>Voir la recette</Text>
                  <IconSymbol name="chevron.right" size={15} color={palette.textInverse} />
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    gap: 14,
  },
  card: {
    borderRadius: Radii.card,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  cardAccent: {
    width: 5,
  },
  cardInner: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitleWrap: {
    flex: 1,
    gap: 3,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.capsule,
  },
  ingredientsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ingredientPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.capsule,
  },
  ctaButton: {
    height: 46,
    borderRadius: Radii.capsule,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
});
