// =====================================================================
// WILDSAURA — Identity Guard Wrapper
// Wraps the entire app and redirects unverified users to the WildSaura
// Identity verification portal before they can access the app.
// =====================================================================
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { isIdentityVerified, redirectToIdentityVerify } from '../lib/identityGuard';

interface Props {
  children: React.ReactNode;
}

/**
 * Renders a loading screen while verifying identity, then renders
 * children once the user is confirmed verified (or not logged in).
 * Unverified users are redirected to identity.wildsaura.com/verify.
 */
export function IdentityGuardWrapper({ children }: Props) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Not logged in or anonymous → no check needed
      if (!user || user.isAnonymous) {
        setChecking(false);
        return;
      }

      // Verify identity in Firestore
      const verified = await isIdentityVerified(user.uid);
      if (!verified) {
        // Redirect away — page will navigate, no need to update state
        redirectToIdentityVerify();
        return;
      }

      setChecking(false);
    });
    return unsubscribe;
  }, []);

  if (checking) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0D1117',
        gap: 12,
      }}>
        <div style={{
          width: 36,
          height: 36,
          border: '3px solid rgba(255,255,255,0.08)',
          borderTop: '3px solid #14B8A6',
          borderRadius: '50%',
          animation: 'ws-spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes ws-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <>{children}</>;
}
