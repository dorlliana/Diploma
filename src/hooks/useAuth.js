import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';

const useAuth = () => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Слідкуємо за станом авторизації
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const register = async (email, password) => {
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(mapFirebaseError(err.code));
      throw err;
    }
  };

  const login = async (email, password) => {
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(mapFirebaseError(err.code));
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const deleteAccount = async () => {
    if (!auth.currentUser) return;
    await deleteUser(auth.currentUser);
    setUser(null);
  };

  const reauthenticate = async (password) => {
    if (!auth.currentUser?.email || !password) return;
    const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
    await reauthenticateWithCredential(auth.currentUser, credential);
  };

  return { user, loading, error, register, login, logout, deleteAccount, reauthenticate };
};

// Людські повідомлення замість Firebase-кодів
const mapFirebaseError = (code) => {
  const map = {
    'auth/user-not-found':       'Користувача не знайдено',
    'auth/wrong-password':       'Невірний пароль',
    'auth/email-already-in-use': 'Email вже зареєстрований',
    'auth/weak-password':        'Пароль має бути не менше 6 символів',
    'auth/invalid-email':        'Невірний формат email',
    'auth/invalid-credential':   'Невірний email або пароль',
    'auth/too-many-requests':    'Забагато спроб. Спробуй пізніше',
  };
  return map[code] || 'Помилка авторизації';
};

export default useAuth;