# UI redesign notes

Design direction: "workshop paper + ink". Flat surfaces, hairline borders, small radii,
no gradients or shadows. Monospace for readings, IDs and small labels. One brand colour
(engineering blue) and a safety-yellow marker used only on the logo and avatar.

New:   context/AuthContext.tsx, components/auth.tsx, components/DashboardHero.tsx,
       app/(auth)/{_layout,welcome,sign-in,sign-up}.tsx, app/(tabs)/profile.tsx
Edited: app/_layout.tsx, app/(tabs)/_layout.tsx, app/(tabs)/index.tsx,
        components/ui.tsx, constants/colors.ts, app.json, assets/images/icon.png

Accounts are local to the phone (prototype). Swap the 3 functions in AuthContext.tsx
for Firebase/Supabase when a real backend is needed.
Core engine and tests are untouched.

Run: pnpm install, then pnpm exec expo start
