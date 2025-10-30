/**
 * NuP-est Design System
 * Centraliza todos os tokens de design, espaçamentos, tipografia e padrões
 */

// === SPACING SCALE ===
export const spacing = {
  xs: '0.5rem',    // 8px
  sm: '0.75rem',   // 12px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
} as const;

// === TYPOGRAPHY SCALE ===
export const typography = {
  // Display
  displayLarge: 'text-4xl font-bold tracking-tight',    // 36px
  displayMedium: 'text-3xl font-semibold tracking-tight', // 30px
  displaySmall: 'text-2xl font-semibold tracking-tight',  // 24px
  
  // Headings
  h1: 'text-3xl font-semibold tracking-tight',
  h2: 'text-2xl font-semibold tracking-tight',
  h3: 'text-xl font-semibold tracking-tight',
  h4: 'text-lg font-medium',
  h5: 'text-base font-medium',
  h6: 'text-sm font-medium',
  
  // Body
  body: 'text-base text-foreground',
  bodyLarge: 'text-lg text-foreground',
  bodySmall: 'text-sm text-foreground',
  caption: 'text-xs text-muted-foreground',
  
  // Labels
  label: 'text-sm font-medium text-foreground',
  labelSmall: 'text-xs font-medium text-foreground uppercase tracking-wide',
} as const;

// === CARD VARIANTS ===
export const cardVariants = {
  default: 'bg-card border border-border/50 rounded-lg shadow-sm',
  hover: 'bg-card border border-border/50 rounded-lg shadow-sm hover:shadow-md transition-shadow',
  interactive: 'bg-card border border-border/50 rounded-lg shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer',
  flat: 'bg-muted/50 border border-transparent rounded-lg',
  ghost: 'bg-transparent border border-transparent rounded-lg hover:bg-muted/50 transition-colors',
} as const;

// === BUTTON SIZE SCALE ===
export const buttonSizes = {
  xs: 'h-7 px-2 text-xs',
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-11 px-6 text-base',
  xl: 'h-12 px-8 text-lg',
} as const;

// === ICON SIZES ===
export const iconSizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
} as const;

// === STATUS COLORS ===
export const statusColors = {
  success: 'text-success bg-success/10 border-success/20',
  warning: 'text-warning bg-warning/10 border-warning/20',
  error: 'text-destructive bg-destructive/10 border-destructive/20',
  info: 'text-info bg-info/10 border-info/20',
  neutral: 'text-muted-foreground bg-muted/50 border-border',
} as const;

// === ANIMATION DURATIONS ===
export const animations = {
  fast: 'duration-150',
  normal: 'duration-200',
  slow: 'duration-300',
} as const;

// === LAYOUT CONSTRAINTS ===
export const layout = {
  maxWidth: {
    sm: 'max-w-2xl',   // 672px
    md: 'max-w-4xl',   // 896px
    lg: 'max-w-6xl',   // 1152px
    xl: 'max-w-7xl',   // 1280px
    full: 'max-w-full',
  },
  sidebar: {
    width: 'w-64',     // 256px
    collapsed: 'w-16', // 64px
  },
  header: {
    height: 'h-14',    // 56px
  },
} as const;

// === EMPTY STATE VARIANTS ===
export const emptyStateVariants = {
  default: {
    icon: iconSizes.xl,
    title: typography.h4,
    description: typography.bodySmall,
    button: buttonSizes.md,
  },
  compact: {
    icon: iconSizes.lg,
    title: typography.h5,
    description: typography.caption,
    button: buttonSizes.sm,
  },
  large: {
    icon: 'h-16 w-16',
    title: typography.h2,
    description: typography.body,
    button: buttonSizes.lg,
  },
} as const;

// === COMMON PATTERNS ===
export const patterns = {
  // Container with max width and padding
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  
  // Section spacing
  section: 'py-8',
  sectionLarge: 'py-12',
  
  // Grid layouts
  grid2: 'grid grid-cols-1 md:grid-cols-2 gap-6',
  grid3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
  grid4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
  
  // Flex patterns
  flexBetween: 'flex items-center justify-between',
  flexCenter: 'flex items-center justify-center',
  flexStart: 'flex items-center justify-start',
  
  // Transitions
  transition: 'transition-all duration-200 ease-in-out',
  transitionColors: 'transition-colors duration-200 ease-in-out',
  
  // Focus ring
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
} as const;

// === NAVIGATION ITEMS ===
export const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: "Home",
    description: "Visão geral dos estudos",
  },
  {
    name: "Biblioteca",
    href: "/library",
    icon: "BookOpen",
    description: "Organize seu conteúdo",
  },
  {
    name: "Estudar",
    href: "/study",
    icon: "Brain",
    description: "Ferramentas de estudo",
  },
  {
    name: "Flashcards",
    href: "/flashcards",
    icon: "Zap",
    description: "Memorização eficaz",
  },
  {
    name: "Metas",
    href: "/goals",
    icon: "Target",
    description: "Acompanhe objetivos",
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: "BarChart3",
    description: "Progresso detalhado",
  },
  {
    name: "Admin",
    href: "/admin/profiles",
    icon: "Settings",
    description: "Gerenciar perfis",
  },
] as const;

// Type exports
export type SpacingKey = keyof typeof spacing;
export type TypographyKey = keyof typeof typography;
export type CardVariant = keyof typeof cardVariants;
export type ButtonSize = keyof typeof buttonSizes;
export type IconSize = keyof typeof iconSizes;
export type StatusColor = keyof typeof statusColors;
