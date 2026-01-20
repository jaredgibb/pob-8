import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase_client.js";

const AuthContext = createContext({
  user: null,
  is_loading: true,
});

export function AuthProvider({ children }) {
  const [user, set_user] = useState(null);
  const [is_loading, set_is_loading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (next_user) => {
      set_user(next_user);
      set_is_loading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      user,
      is_loading,
    }),
    [user, is_loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function use_auth() {
  return useContext(AuthContext);
}
