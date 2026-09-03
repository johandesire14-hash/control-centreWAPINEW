import colors from "@/constants/colors";
import { useTheme } from "@/lib/theme";

export function useColors() {
  const { isDark } = useTheme();
  const palette = isDark && "dark" in colors ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius, radiusSm: colors.radiusSm };
}
