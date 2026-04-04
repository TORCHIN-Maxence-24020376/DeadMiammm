import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/constants/theme';
import { useAppSettings } from '@/providers/app-settings-provider';
import { useInventory } from '@/providers/inventory-provider';
import { useAppTheme } from '@/providers/theme-provider';
import { buildRecipeSuggestions } from '@/utils/recipes';

export default function RecipesScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { products } = useInventory();
  const { expiringSoonDays } = useAppSettings();

  const recipes = buildRecipeSuggestions(products, { expiringSoonDays });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <View style={[styles.header, { borderBottomColor: palette.border }]}> 
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: palette.surfaceSoft }]}> 
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Recettes suggérées</Text>

        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {recipes.map((recipe, recipeIndex) => (
          <View key={`${recipe.id}-${recipeIndex}`} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <View style={styles.cardHeader}>
              <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>{recipe.title}</Text>
              <Text style={[Typography.labelMd, { color: palette.accentPrimary }]}>{recipe.time}</Text>
            </View>

            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
              Basé sur les produits à moins de {expiringSoonDays} jour{expiringSoonDays > 1 ? 's' : ''} de la date limite.
            </Text>

            <View style={styles.ingredientsWrap}>
              {recipe.ingredients.map((ingredient, ingredientIndex) => (
                <View key={`${recipe.id}-${ingredientIndex}`} style={[styles.ingredientPill, { backgroundColor: palette.surfaceSoft }]}> 
                  <Text style={[Typography.caption, { color: palette.textPrimary }]}>{ingredient}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => router.push(`/recipe/${recipe.id}`)}
              style={[styles.ctaButton, { backgroundColor: palette.accentPrimary }]}>
              <Text style={[Typography.labelLg, { color: palette.textInverse }]}>Voir la recette</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  ingredientsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingredientPill: {
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButton: {
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
