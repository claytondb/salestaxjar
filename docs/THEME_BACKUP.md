# SalesTaxJar Theme Backup
> Backup of original theme (before color overhaul) - Created for potential revert

## Original Color Scheme

### Background Gradient
```css
/* Main page backgrounds */
bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900
```

### Primary Accent Colors (Emerald)
```css
/* Main brand/action colors */
emerald-400: #34d399  /* Light accent, hover text */
emerald-500: #10b981  /* Primary buttons, CTAs */
emerald-600: #059669  /* Hover state for buttons */
emerald-500/20       /* Active state backgrounds */
emerald-500/10       /* Light tint backgrounds */
```

### Logo Gradient
```css
/* Logo icon */
bg-gradient-to-br from-green-400 to-emerald-600
/* green-400: #4ade80 */
/* emerald-600: #059669 */
```

### Slate/Gray Scale
```css
slate-900: #0f172a   /* Dark background base */
slate-800: #1e293b   /* Dropdown/select backgrounds */
```

### White/Opacity Variants
```css
white: #ffffff
white/10: rgba(255,255,255,0.1)  /* Card backgrounds */
white/20: rgba(255,255,255,0.2)  /* Borders, hover states */
white/5: rgba(255,255,255,0.05)  /* Subtle backgrounds */
```

### Text Colors
```css
white: #ffffff       /* Headers, primary text */
gray-300: #d1d5db    /* Secondary text */
gray-400: #9ca3af    /* Tertiary text, labels */
gray-500: #6b7280    /* Muted text */
```

### Border Colors
```css
border-white/10      /* Standard borders */
border-white/20      /* Input borders */
border-emerald-500   /* Active/selected state borders */
border-emerald-500/30 /* Success message borders */
```

### Warning/Alert Colors
```css
amber-400: #fbbf24   /* Warning text */
amber-500/10        /* Warning background */
amber-500/30        /* Warning border */
yellow-400: #facc15  /* Coming soon badges */
yellow-500/20       /* Coming soon background */
```

### Error/Delete Colors
```css
red-400: #f87171     /* Error text */
red-500: #ef4444     /* Delete buttons */
red-500/10          /* Error background */
red-500/30          /* Error borders */
```

### Purple Accent (Plan Selection)
```css
purple-500: #a855f7  /* Selected plan highlight */
purple-500/20       /* Selected background */
purple-500/30       /* Selected border */
```

### Cyan Accent
```css
cyan-400: #22d3ee    /* Gradient text accents */
cyan-500/20         /* Gradient overlays */
```

## Component Patterns

### Cards
```css
bg-white/10 backdrop-blur rounded-xl border border-white/10
```

### Primary Buttons
```css
bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition
```

### Secondary Buttons
```css
border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 rounded-lg
```

### Input Fields
```css
bg-white/10 border border-white/20 rounded-lg text-white 
focus:outline-none focus:ring-2 focus:ring-emerald-500
```

### Active Navigation
```css
bg-emerald-500/20 text-emerald-400
```

### Inactive Navigation
```css
text-gray-300 hover:text-white hover:bg-white/5
```

### Loading Spinner
```css
border-t-2 border-b-2 border-emerald-500
```

## Header Styling
```css
/* Logged in header */
bg-slate-900 border-b border-white/10

/* Logged out header */
border-b border-white/10 (transparent background)
```

## Files Using These Colors
- `src/app/page.tsx` (homepage)
- `src/app/pricing/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/globals.css`
- `src/components/Header.tsx`
- `src/components/Footer.tsx`
- All other page components

---
*Last backup: Auto-generated before theme overhaul*
