import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Дошки за замовчуванням для нового користувача
const DEFAULT_BOARDS = ['Main Workspace'];

const useBoards = (userId) => {
  const [boards, setBoards]             = useState(DEFAULT_BOARDS);
  const [currentBoard, setCurrentBoard] = useState(DEFAULT_BOARDS[0]);
  const [loading, setLoading]           = useState(true);

  // Ключ для зберігання списку дошок користувача
  const boardsListDocId = userId ? `boardsList_${userId}` : null;

  // Завантажуємо список дошок користувача з Firebase
  useEffect(() => {
    if (!userId) return;

    const loadBoards = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'boardsList', boardsListDocId));
        if (snap.exists()) {
          const data = snap.data();
          setBoards(data.boards);
          setCurrentBoard((prev) =>
            data.boards.includes(prev) ? prev : data.boards[0]
          );
        } else {
          // Перший вхід — зберігаємо дошки за замовчуванням
          await setDoc(doc(db, 'boardsList', boardsListDocId), {
            boards: DEFAULT_BOARDS,
          });
          setBoards(DEFAULT_BOARDS);
          setCurrentBoard(DEFAULT_BOARDS[0]);
        }
      } catch (err) {
        console.error('Помилка завантаження дошок:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBoards();
  }, [userId, boardsListDocId]);

  // Зберігаємо оновлений список дошок у Firebase
  const saveBoardsList = useCallback(async (newBoards) => {
    if (!boardsListDocId) return;
    try {
      await setDoc(doc(db, 'boardsList', boardsListDocId), {
        boards: newBoards,
      });
    } catch (err) {
      console.error('Помилка збереження списку дошок:', err);
    }
  }, [boardsListDocId]);

  // Додати нову дошку
  const addBoard = useCallback(async (name) => {
    const trimmed = name.trim();
    if (!trimmed || boards.includes(trimmed)) return;

    const newBoards = [...boards, trimmed];
    setBoards(newBoards);
    setCurrentBoard(trimmed);
    await saveBoardsList(newBoards);
  }, [boards, saveBoardsList]);

  // Перейменувати дошку
  const renameBoard = useCallback(async (oldName, newName) => {
  const trimmed = newName.trim();
  if (!trimmed || boards.includes(trimmed) || trimmed === oldName) return;

  // Спочатку копіюємо дані, ПОТІМ міняємо назву
  try {
    const oldDocId = `${userId}_${oldName}`;
    const newDocId = `${userId}_${trimmed}`;
    const snap = await getDoc(doc(db, 'boards', oldDocId));
    if (snap.exists()) {
      await setDoc(doc(db, 'boards', newDocId), snap.data());
      await deleteDoc(doc(db, 'boards', oldDocId));
    }
  } catch (err) {
    console.error('Помилка перейменування дошки:', err);
    return; // не міняємо назву якщо операція не вдалась
  }

  const newBoards = boards.map(b => b === oldName ? trimmed : b);
  setBoards(newBoards);
  if (currentBoard === oldName) setCurrentBoard(trimmed);
  await saveBoardsList(newBoards);
}, [boards, currentBoard, userId, saveBoardsList]);

  // Змінити порядок дошок (як вкладки у VS Code)
  const reorderBoards = useCallback(async (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const newBoards = [...boards];
    const [moved] = newBoards.splice(fromIndex, 1);
    newBoards.splice(toIndex, 0, moved);
    setBoards(newBoards);
    await saveBoardsList(newBoards);
  }, [boards, saveBoardsList]);

  // Видалити дошку
  const deleteBoard = useCallback(async (name) => {
    if (boards.length <= 1) return; // не можна видалити останню

    const newBoards = boards.filter(b => b !== name);
    setBoards(newBoards);

    // Якщо видаляємо поточну — переключаємось на першу
    if (currentBoard === name) setCurrentBoard(newBoards[0]);

    // Видаляємо дані канвасу цієї дошки
    try {
      await deleteDoc(doc(db, 'boards', `${userId}_${name}`));
    } catch (err) {
      console.error('Помилка видалення дошки:', err);
    }

    await saveBoardsList(newBoards);
  }, [boards, currentBoard, userId, saveBoardsList]);

  return {
    boards,
    currentBoard,
    setCurrentBoard,
    loading,
    addBoard,
    renameBoard,
    deleteBoard,
    reorderBoards,
  };
};

export default useBoards;